import subprocess

def run():
    print("Checking npm run build...")
    try:
        out = subprocess.check_output("npm run build", shell=True, stderr=subprocess.STDOUT)
        print("Build OK")
    except subprocess.CalledProcessError as e:
        print("Build failed:", e.output.decode('utf-8'))

if __name__ == '__main__':
    run()
