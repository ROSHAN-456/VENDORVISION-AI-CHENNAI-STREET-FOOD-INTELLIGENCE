import sys
import traceback

with open("check_log.txt", "w") as f:
    try:
        sys.path.append('backend')
        import main
        f.write("Backend loaded successfully!\n")
    except Exception as e:
        f.write("Error:\n")
        f.write(traceback.format_exc())
