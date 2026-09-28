"""Run one command, tee its output to a log, and record wall time and peak memory.

Usage (from Code/nanochat, with the nanochat venv's python):
    .venv/Scripts/python ../tools/run_logged.py LOG_PATH -- python -m scripts.base_train ...
A leading "python" in the command is replaced by the interpreter running this script.

Peak memory is the largest resident set size (sum over the process tree), sampled every 0.5 s.
A summary line "[run_logged] exit=.. wall_s=.. peak_rss_mb=.." ends the log.
"""
import subprocess
import sys
import threading
import time

import psutil

def main():
    sep = sys.argv.index("--")
    log_path, cmd = sys.argv[1], sys.argv[sep + 1:]
    if cmd[0] == "python":
        cmd[0] = sys.executable  # same interpreter (the venv), independent of PATH
    peak = 0
    t0 = time.time()
    with open(log_path, "w", encoding="utf-8") as log:
        log.write("[run_logged] cmd: " + " ".join(cmd) + "\n")
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace", bufsize=1)
        ps = psutil.Process(proc.pid)
        done = threading.Event()

        def sample():
            nonlocal peak
            while not done.is_set():
                try:
                    rss = ps.memory_info().rss + sum(c.memory_info().rss for c in ps.children(recursive=True))
                    peak = max(peak, rss)
                except psutil.Error:
                    pass
                time.sleep(0.5)

        threading.Thread(target=sample, daemon=True).start()
        for line in proc.stdout:
            sys.stdout.write(line)
            log.write(line)
        code = proc.wait()
        done.set()
        summary = f"[run_logged] exit={code} wall_s={time.time() - t0:.1f} peak_rss_mb={peak / 2**20:.0f}"
        print(summary)
        log.write(summary + "\n")
    sys.exit(code)

if __name__ == "__main__":
    main()
