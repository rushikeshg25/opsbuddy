package internal

import (
	"container/heap"
	"sync"
	"time"
)

type PingItem struct {
	ProductID  uint
	HealthAPI  string
	NextPingAt time.Time
	RetryCount int
	IsDown     bool
}

type PingHeap struct {
	items []*PingItem
	known map[uint]struct{}
	mutex sync.RWMutex
}

func NewPingHeap() *PingHeap {
	h := &PingHeap{
		items: make([]*PingItem, 0),
		known: make(map[uint]struct{}),
	}
	heap.Init(h)
	return h
}

func (h *PingHeap) Len() int {
	return len(h.items)
}

func (h *PingHeap) Less(i, j int) bool {
	return h.items[i].NextPingAt.Before(h.items[j].NextPingAt)
}

func (h *PingHeap) Swap(i, j int) {
	h.items[i], h.items[j] = h.items[j], h.items[i]
}

func (h *PingHeap) Push(x interface{}) {
	h.items = append(h.items, x.(*PingItem))
}

func (h *PingHeap) Pop() interface{} {
	old := h.items
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	h.items = old[0 : n-1]
	return item
}

func (h *PingHeap) SafePush(item *PingItem) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	heap.Push(h, item)
}

func (h *PingHeap) SafePop() *PingItem {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	if h.Len() == 0 {
		return nil
	}
	return heap.Pop(h).(*PingItem)
}

func (h *PingHeap) SafePeek() *PingItem {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	if h.Len() == 0 {
		return nil
	}
	return h.items[0]
}

func (h *PingHeap) SafeLen() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return h.Len()
}

// Register tracks scheduled AND in-flight products in constant time.
func (h *PingHeap) Register(item *PingItem) bool {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	if _, exists := h.known[item.ProductID]; exists {
		return false
	}
	h.known[item.ProductID] = struct{}{}
	heap.Push(h, item)
	return true
}

// PopReady makes the peek/pop decision under one lock.
func (h *PingHeap) PopReady(now time.Time) *PingItem {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	if len(h.items) == 0 || h.items[0].NextPingAt.After(now) {
		return nil
	}
	return heap.Pop(h).(*PingItem)
}
