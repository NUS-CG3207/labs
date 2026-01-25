# Memory Access Patterns and Performance

## Setup

- Large array (64M elements, ~512MB)
- Block size = 64 elements (~512 bytes, ~8 cache lines)
- We're measuring different ways to traverse this array

---

## Understanding Hardware Prefetching

Before analyzing the patterns, let's understand how modern CPUs extend basic caching.

**What is Hardware Prefetching?**

Hardware prefetchers are circuits that monitor your memory access patterns and automatically fetch cache lines they predict you'll need next, **before** you actually request them.

**Common Prefetcher Types:**

1. **Sequential/Stream Prefetcher**: Detects sequential access patterns
   - Sees: address 100, 104, 108...
   - Predicts: 112, 116, 120... and fetches them

2. **Stride Prefetcher**: Detects regular stride patterns
   - Sees: address 100, 200, 300...
   - Learns: stride of 100, predicts 400, 500, 600...

3. **Next-Line Prefetcher**: Always fetches the next cache line
   - Simple but effective for sequential workloads

**Key Points:**

- Prefetchers work **between cache lines**, not within cache lines
- They predict which cache line to fetch next based on observed patterns
- They can eliminate many cache misses by fetching data before it's needed
- Prefetching works within page boundaries, not across. A page = 1 to 4 KB depending on architecture

**Impact on Cache Behavior:**

- **Traditional "compulsory" misses**: First access to any cache line always misses
- **With prefetching**: Many "compulsory" misses become hits because data was prefetched
- **Proactive replacement**: Cache lines may be evicted to make room for prefetched data

---

## Pattern Analysis

### 1. Perfect Sequential

0, 1, 2, 3, 4, 5, 6, 7 | 8, 9, 10, 11, 12, 13, 14, 15 | 16, 17, 18, 19, 20, 21, 22, 23 | ...

- **Cache behavior:** Excellent spatial locality within each cache line
- **Prefetcher behavior:** Stream prefetcher detects pattern, aggressively prefetches ahead
- **Result:** Most cache misses eliminated by prefetching
- **Expected performance:** Best

### 2. Fully Random

5, 12, 27, 3, 38, 1, 19, 33, 8, 25, 14, 0, 31, 22, 6, 35, 17, 4, 28, 11, 39, 2, 16, 30, ...

- **Cache behavior:** Poor spatial locality, frequent cache misses
- **Prefetcher behavior:** No detectable pattern, prefetchers remain inactive
- **Result:** Every access suffers cache miss, no prefetch assistance
- **Expected performance:** Worst

### 3. Block-Sequential Inside, Block-Random

24, 25, 26, 27, 28, 29, 30, 31 | 0, 1, 2, 3, 4, 5, 6, 7 | 16, 17, 18, 19, 20, 21, 22, 23 | 32, 33, 34, 35, 36, 37, 38, 39 | 8, 9, 10, 11, 12, 13, 14, 15

- **Cache behavior:** Good spatial locality within each block
- **Prefetcher behavior:** **Cannot help** - random jumps between blocks break any learnable pattern
- **Result:** Cache miss at start of each new block, no prefetch assistance
- **Expected performance:** Moderate

### 4. Random-in-Block, Block-Random

28, 24, 31, 26, 30, 25, 27, 29 | 3, 0, 6, 1, 7, 2, 4, 5 | 19, 22, 16, 20, 17, 23, 18, 21 | 35, 32, 39, 34, 38, 33, 36, 37 | 10, 15, 8, 12, 9, 14, 11, 13

- **Cache behavior:** **Identical to #3** - spatial locality within cache lines unchanged
- **Prefetcher behavior:** **Identical to #3** - random block order provides no pattern
- **Result:** Same cache miss behavior as #3
- **Expected performance:** Same as #3

### 5. Block-Sequential Inside, Constant-Stride Blocks (stride=3)

0, 1, 2, 3, 4, 5, 6, 7 | 24, 25, 26, 27, 28, 29, 30, 31 | 48, 49, 50, 51, 52, 53, 54, 55 | 72, 73, 74, 75, 76, 77, 78, 79 | 8, 9, 10, 11, 12, 13, 14, 15 | 32, 33, 34, 35, 36, 37, 38, 39 | 56, 57, 58, 59, 60, 61, 62, 63 | 16, 17, 18, 19, 20, 21, 22, 23 | 40, 41, 42, 43, 44, 45, 46, 47 | 64, 65, 66, 67, 68, 69, 70, 71

*(Block order: 0→3→6→9→1→4→7→2→5→8, showing clear stride=3 pattern)*

- **Cache behavior:** Good spatial locality within blocks
- **Prefetcher behavior:** **Stride prefetcher learns the pattern!** Detects regular block-to-block stride.
- **Result:** Prefetcher fetches future blocks before they're accessed
- **Expected performance:** Very good

### 6. Random-in-Block, Constant-Stride Blocks (stride=3)

2, 0, 6, 1, 7, 3, 4, 5 | 28, 24, 31, 26, 30, 25, 27, 29 | 52, 48, 55, 50, 54, 49, 51, 53 | 76, 72, 79, 74, 78, 73, 75, 77 | 10, 15, 8, 12, 9, 14, 11, 13 | 35, 32, 39, 34, 38, 33, 36, 37 | 59, 56, 63, 58, 62, 57, 60, 61 | 19, 22, 16, 20, 17, 23, 18, 21 | 43, 40, 47, 42, 46, 41, 44, 45 | 67, 64, 71, 66, 70, 65, 68, 69

*(Same block order as case 5, but elements within each block are shuffled)*

- **Cache behavior:** **Same as #5** - spatial locality within cache lines unchanged
- **Prefetcher behavior:** **Same as #5** - stride prefetcher still learns block-level pattern
- **Result:** Same prefetch benefits as #5
- **Expected performance:** Same as #5

---

## Key Insights

1. **Cache lines are the fundamental unit** - both for caching and prefetching
2. **Within-cache-line order is irrelevant** - explains why cases 3&4 and 5&6 perform identically
3. **Predictable patterns enable prefetching** - regular strides help even when not sequential
4. **Modern memory systems are pattern-aware** - they adapt to your access behavior

This demonstrates how hardware prefetching transforms cache behavior from reactive (fetch when missed) to predictive (fetch before needed), but only when access patterns are learnable at the cache line level.

``` bash

gcc -O2 -g -fno-omit-frame-pointer cache_access.c -o cache_access
./cache_access

```

1) Perfect sequential:                             0.131 s
2) Fully random:                                    0.857 s
3) Block-seq inside, block-random:                 0.146 s
4) Random-in-block, block-random:                  0.131 s
5) Block-seq inside, constant-stride blocks:        0.107 s
6) Random-in-block, constant-stride blocks:         0.107 s
Dummy sum: 13510798647235528.00

