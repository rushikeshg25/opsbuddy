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
	mutex sync.RWMutex
}

func NewPingHeap() *PingHeap {
	h := &PingHeap{
		items: make([]*PingItem, 0),
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
