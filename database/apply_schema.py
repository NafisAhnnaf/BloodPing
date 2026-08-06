import os
import psycopg2

def load_env(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

def main():
    # Load env from backend/.env
    dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
    load_env(dotenv_path)
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in env.")
        return
        
    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Creating auth schema and auth.users table if not exists...")
    try:
        cur.execute("CREATE SCHEMA IF NOT EXISTS auth;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL
            );
        """)
    except Exception as e:
        print(f"Skipping auth schema/users table creation (likely already exists): {e}")
    
    # Run DDL
    ddl_path = os.path.join(os.path.dirname(__file__), 'ddl/ddl.sql')
    print(f"Running DDL from {ddl_path}...")
    with open(ddl_path, 'r') as f:
        ddl_sql = f.read()
    # Execute DDL
    cur.execute(ddl_sql)
    
    # Collect functions
    functions_dir = os.path.join(os.path.dirname(__file__), 'plpgsql/functions')
    procedures_dir = os.path.join(os.path.dirname(__file__), 'plpgsql/procedures')
    
    sql_files = []
    
    # 1. Base functions
    base_funcs = []
    for f in os.listdir(functions_dir):
        p = os.path.join(functions_dir, f)
        if os.path.isfile(p) and f.endswith('.sql'):
            base_funcs.append(p)
    # Sort base functions by their name (starts with numbers)
    base_funcs.sort(key=lambda x: os.path.basename(x))
    sql_files.extend(base_funcs)
    
    # 2. Subdirectory functions
    subdirs = ['donations', 'matches', 'requests', 'stats']
    for sd in subdirs:
        sd_path = os.path.join(functions_dir, sd)
        if os.path.isdir(sd_path):
            sd_files = [os.path.join(sd_path, f) for f in os.listdir(sd_path) if f.endswith('.sql')]
            sd_files.sort()
            sql_files.extend(sd_files)
            
    # 3. Procedures
    procs = []
    for f in os.listdir(procedures_dir):
        p = os.path.join(procedures_dir, f)
        if os.path.isfile(p) and f.endswith('.sql'):
            procs.append(p)
    # Sort procedures
    procs.sort(key=lambda x: os.path.basename(x))
    sql_files.extend(procs)
    
    # Run all SQL files
    for sql_file in sql_files:
        print(f"Applying {os.path.relpath(sql_file, start=os.path.dirname(__file__))}...")
        with open(sql_file, 'r') as f:
            sql_content = f.read()
        try:
            cur.execute(sql_content)
        except Exception as e:
            print(f"Error applying {sql_file}: {e}")
            raise e
            
    print("Database schema and all functions/procedures applied successfully!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
