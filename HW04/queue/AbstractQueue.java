package queue;

import java.util.function.Predicate;

public abstract class AbstractQueue implements Queue {
    protected int size = 0;

    private interface Operation {
        void operate();
    }

    @Override
    public void enqueue(Object x) {
        assert x != null;
        enqueueImpl(x);
        size++;
    }

    protected abstract void enqueueImpl(Object x);

    @Override
    public Object element() {
        assert size > 0;
        return elementImpl();
    }

    protected abstract Object elementImpl();

    @Override
    public Object dequeue() {
        assert size > 0;
        Object x = element();
        dequeueImpl();
        size--;
        return x;
    }

    protected abstract void dequeueImpl();

    @Override
    public int size() {
        return size;
    }

    @Override
    public boolean isEmpty() {
        return size == 0;
    }

    @Override
    public void clear() {
        clearImpl();
        size = 0;
    }

    protected abstract void clearImpl();

    @Override
    public void removeIf(Predicate<Object> predicate) {
        retainIf(predicate.negate());
    }

    @Override
    public void retainIf(Predicate<Object> predicate) {
        int iterations = size;
        for (int i = 0; i < iterations; i++) {
            Object x = dequeue();
            if (predicate.test(x)) {
                enqueue(x);
            }
        }
    }

    private void doWhile(Predicate<Object> predicate, Operation operation, int deleteMultiplier) {
        int iterations = size;
        for (int i = 0; i < iterations; i++) {
            if (predicate.test(element())) {
                operation.operate();
            } else {
                for (int j = 0; j < (iterations - i) * deleteMultiplier; j++) {
                    dequeue();
                }
                return;
            }
        }
    }

    @Override
    public void takeWhile(Predicate<Object> predicate) {
        doWhile(predicate, () -> enqueue(dequeue()), 1);
    }

    @Override
    public void dropWhile(Predicate<Object> predicate) {
        doWhile(predicate, this::dequeue, 0);
    }
}
