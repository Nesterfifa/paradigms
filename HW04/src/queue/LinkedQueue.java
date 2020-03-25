package queue;

public class LinkedQueue extends AbstractQueue {
    private Node head, tail;

    @Override
    protected void enqueueImpl(Object x) {
        tail = new Node(x, tail);
        if (head == null) {
            head = tail;
        }
    }

    @Override
    protected Object elementImpl() {
        return head.value;
    }

    @Override
    protected void dequeueImpl() {
        head = head.next;
    }

    @Override
    protected void clearImpl() {
        head = tail = null;
    }

    private static class Node {
        private Object value;
        private Node next;

        public Node(Object value, Node prev) {
            if (prev != null) {
                prev.next = this;
            }
            this.value = value;
        }
    }
}
