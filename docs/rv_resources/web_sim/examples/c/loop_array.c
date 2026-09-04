// Array Search & Accumulation
int arr[] = { 12, 45, 7, 23, 89, 54, 31, 68 };
int size = 8;

int find_max(int *data, int len) {
    int max = data[0];
    for (int i = 1; i < len; i++) {
        if (data[i] > max) {
            max = data[i];
        }
    }
    return max;
}

int main() {
    int max_val = find_max(arr, size);
    return max_val; // 89 in a0
}
