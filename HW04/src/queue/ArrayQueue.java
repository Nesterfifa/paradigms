package queue;

public class ArrayQueue extends AbstractQueue {
    private Object[] elements = new Object[1];
    private int head = 0;

    @Override
    protected void enqueueImpl(Object x) {
        ensureCapacity(size + 1);
        elements[(head + size) % elements.length] = x;
    }

    private void ensureCapacity(int capacity) {
        if (elements.length == capacity) {
            Object[] buf = new Object[elements.length * 2];
            System.arraycopy(elements, head, buf, 0, elements.length - head);
            System.arraycopy(elements, 0, buf, elements.length - head, head);
            elements = buf;
            head = 0;
        }
    }

    @Override
    protected Object elementImpl() {
        return elements[head];
    }

    @Override
    protected void dequeueImpl() {
        elements[head] = null;
        head = (head + 1) % elements.length;
    }

    @Override
    protected void clearImpl() {
        head = 0;
        elements = new Object[1];
    }
}
