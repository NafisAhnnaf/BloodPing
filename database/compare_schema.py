import os
import re
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Add backend directory to path to load settings
backend_dir = os.path.join(os.path.dirname(__file__), '../backend')
sys.path.append(backend_dir)
load_dotenv(os.path.join(backend_dir, '.env'))

from app.config import settings

def parse_ddl_tables(ddl_path):
    with open(ddl_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find CREATE TABLE public.table_name ( ... );
    table_blocks = re.findall(r'CREATE TABLE\s+public\.(\w+)\s*\((.*?)\);', content, re.DOTALL | re.IGNORECASE)
    
    tables = {}
    for table_name, block in table_blocks:
        columns = {}
        in_constraint = False
        paren_depth = 0
        for line in block.split('\n'):
            line = line.strip()
            # Clean comments
            line = line.split('--')[0].strip()
            if not line:
                continue
            
            # If inside a multi-line constraint, skip until parentheses balance
            if in_constraint:
                paren_depth += line.count('(') - line.count(')')
                if paren_depth <= 0:
                    in_constraint = False
                continue
            
            # Detect starting a constraint definition or inline multi-line CHECK constraint
            if line.startswith('CONSTRAINT') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE') or 'CHECK' in line:
                paren_depth = line.count('(') - line.count(')')
                if paren_depth > 0:
                    in_constraint = True
                if line.startswith('CONSTRAINT') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE') or line.startswith('CHECK'):
                    continue
            
            # If the line ends with a comma, strip it
            if line.endswith(','):
                line = line[:-1].strip()
                
            tokens = line.split()
            if not tokens:
                continue
            
            col_name = tokens[0].lower()
            
            # Extract the data type by resolving parentheses and multi-word types
            col_type_tokens = []
            cur_paren_count = 0
            for i, t in enumerate(tokens[1:]):
                col_type_tokens.append(t)
                cur_paren_count += t.count('(') - t.count(')')
                if cur_paren_count == 0:
                    # Lookahead for multi-word types
                    next_tokens = [x.lower() for x in tokens[2+i:]]
                    if t.lower() == 'double' and next_tokens and next_tokens[0] == 'precision':
                        continue
                    if t.lower() == 'timestamp' and next_tokens and next_tokens[0] in ('with', 'without'):
                        continue
                    if t.lower() in ('with', 'without') and next_tokens and next_tokens[0] == 'time':
                        continue
                    if t.lower() == 'time' and next_tokens and next_tokens[0] == 'zone':
                        continue
                    break
            
            col_type = ' '.join(col_type_tokens).lower()
            
            # Normalize types to match Postgres udt_name mapping
            col_type = col_type.replace('public.', '')
            if 'uuid' in col_type:
                norm_type = 'uuid'
            elif 'timestamptz' in col_type or 'timestamp with time zone' in col_type:
                norm_type = 'timestamptz'
            elif 'timestamp' in col_type:
                norm_type = 'timestamp'
            elif 'varchar' in col_type:
                norm_type = 'varchar'
            elif 'text' in col_type:
                norm_type = 'text'
            elif 'boolean' in col_type or 'bool' in col_type:
                norm_type = 'bool'
            elif 'smallint' in col_type:
                norm_type = 'int2'
            elif 'integer' in col_type or 'int4' in col_type:
                norm_type = 'int4'
            elif 'bigint' in col_type or 'int8' in col_type:
                norm_type = 'int8'
            elif 'numeric' in col_type:
                norm_type = 'numeric'
            elif 'macaddr' in col_type:
                norm_type = 'macaddr'
            elif 'date' in col_type:
                norm_type = 'date'
            elif 'geography' in col_type:
                norm_type = 'geography'
            elif 'blood_group' in col_type:
                norm_type = 'blood_group'
            elif 'document_status' in col_type:
                norm_type = 'document_status'
            else:
                norm_type = col_type
            
            columns[col_name] = norm_type
        tables[table_name.lower()] = columns
    return tables

def get_database_schema(db_url):
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Query tables, columns, and types in public schema
    cur.execute("""
        SELECT 
            table_name, 
            column_name, 
            udt_name 
        FROM 
            information_schema.columns 
        WHERE 
            table_schema = 'public';
    """)
    rows = cur.fetchall()
    
    # Query functions and procedures in public schema
    cur.execute("""
        SELECT 
            routine_name 
        FROM 
            information_schema.routines 
        WHERE 
            routine_schema = 'public';
    """)
    routines = [r['routine_name'].lower() for r in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    db_tables = {}
    for row in rows:
        t_name = row['table_name'].lower()
        c_name = row['column_name'].lower()
        type_name = row['udt_name'].lower()
        
        if t_name not in db_tables:
            db_tables[t_name] = {}
        db_tables[t_name][c_name] = type_name
        
    return db_tables, routines

def scan_local_routines(plpgsql_dir):
    routines = set()
    for root, dirs, files in os.walk(plpgsql_dir):
        for file in files:
            if file.endswith('.sql'):
                # Extract filename without extension
                name = file.replace('.sql', '')
                # Strip numeric prefixes (e.g. 03_get_user_role -> get_user_role)
                name = re.sub(r'^\d+_', '', name)
                routines.add(name.lower())
    return list(routines)

def main():
    ddl_path = os.path.join(os.path.dirname(__file__), 'ddl/ddl.sql')
    plpgsql_dir = os.path.join(os.path.dirname(__file__), 'plpgsql')
    
    print("Parsing local schema files...")
    local_tables = parse_ddl_tables(ddl_path)
    local_routines = scan_local_routines(plpgsql_dir)
    
    print("Fetching active database schema...")
    try:
        db_tables, db_routines = get_database_schema(settings.DATABASE_URL)
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to connect to database: {e}")
        sys.exit(1)
        
    mismatches = []
    
    # 1. Compare Tables
    for table_name, local_cols in local_tables.items():
        if table_name not in db_tables:
            mismatches.append(f"Table '{table_name}' defined in DDL but missing in database.")
            continue
            
        db_cols = db_tables[table_name]
        # Compare Columns
        for col_name, local_type in local_cols.items():
            if col_name not in db_cols:
                mismatches.append(f"Column '{col_name}' in table '{table_name}' defined in DDL but missing in database.")
            else:
                db_type = db_cols[col_name]
                if local_type != db_type:
                    mismatches.append(f"Column '{col_name}' in table '{table_name}' type mismatch: DDL={local_type}, DB={db_type}.")
                    
    # 2. Compare Routines (Functions/Procedures)
    for routine in local_routines:
        if routine not in db_routines:
            mismatches.append(f"Function/Procedure '{routine}' defined locally but missing in database.")
            
    if mismatches:
        print("\n" + "="*60)
        print("SCHEMA MISMATCH DETECTED!")
        print("="*60)
        for diff in mismatches:
            print(f" - {diff}")
        print("="*60 + "\n")
        raise RuntimeError("Database schema does not match local DDL files.")
    else:
        print("Schema verification successful: Database is in sync with DDL definitions!")

if __name__ == '__main__':
    main()
