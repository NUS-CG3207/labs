// Fibonacci Series Generator
int fib[10];

int compute_fib(int n) {
    if (n <= 0) return 0;
    fib[0] = 0;
    fib[1] = 1;
    for (int i = 2; i < n; i++) {
        fib[i] = fib[i - 1] + fib[i - 2];
    }
    return fib[n - 1];
}

int main() {
    int last = compute_fib(10);
    return last; // 34 in a0
}
