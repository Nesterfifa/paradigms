package queue;

import java.util.function.Predicate;

// a - stored elements
// n - length of a

public interface Queue extends Cloneable {
    // Inv: n >= 0 && for all i in 0..n - 1 : a[i] != null

    // Pre: x != null
    // Post: n' == n + 1 && for all i in 0..n - 1: a[i] == a'[i] && a'[n] == x
    void enqueue(Object x);

    // Pre: n > 0
    // Post: a' == a && R == a[0]
    Object element();

    // Pre: n > 0
    // Post: n' == n - 1 && for all i in 0..n' - 1: a'[i] == a[i + 1]
    Object dequeue();

    // Pre:
    // Post: R == n && a' == a
    int size();

    // Pre:
    // Post: R == (n == 0) && a' == a
    boolean isEmpty();

    // Pre:
    // Post: n == 0 && a' == {}
    void clear();

    // Pre: predicate != null
    // Post: n' <= n
    // && exist i_0, i_1, ... i_(n'-1)
    // | (for all j in 0..n' - 1: a'[j] == a[i_j]
    // && predicate(a'[j] == false) && for all k in 0..n'-1, k != i_0..n(n'-1) : predicate(a[k]) == true)
    void removeIf(Predicate<Object> predicate);

    // Pre: predicate != null
    // Post: n' <= n
    // && exist i_0, i_1, ... i_(n'-1)
    // | (for all j in 0..n' - 1: a'[j] == a[i_j]
    // && predicate(a'[j] == true) && for all k in 0..n'-1, k != i_0..n(n'-1) : predicate(a[k]) == false)
    void retainIf(Predicate<Object> predicate);

    // Pre: predicate != null
    // Post: n' <= n
    // && exists ! k
    // | n' == n - k
    // && for all i in 0..k - 1: (a'[i] == a[i] && predicate(a[i]) == true)
    // && for all i in k..n - 1: predicate(a[i]) == false
    void takeWhile(Predicate<Object> predicate);

    // Pre: predicate != null
    // Post: n' <= n
    // && exists ! k
    // | n' == n - k
    // && for all i in k..n - 1: (a'[i - k] == a[i] && predicate(a[i]) == false)
    // && for all i in 0..k - 1: predicate(a[i]) == true
    void dropWhile(Predicate<Object> predicate);
}
