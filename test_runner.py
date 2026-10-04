import os
import subprocess

try:
    res = subprocess.run(["python", "test_main.py"], capture_output=True, text=True, check=True)
    with open("results_ok.txt", "w") as f:
        f.write(res.stdout)
except subprocess.CalledProcessError as e:
    with open("results_ok.txt", "w") as f:
        f.write("ERROR:\n")
        f.write(e.stderr)
