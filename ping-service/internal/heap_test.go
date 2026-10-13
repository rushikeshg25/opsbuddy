package internal

import (
	"testing"
	"time"
)

func TestRegisterIncludesInflightItems(t *testing.T) {
	h := NewPingHeap()
	item := &PingItem{ProductID: 1, NextPingAt: time.Now()}
	if !h.Register(item) {
		t.Fatal("initial registration failed")
	}
	if h.PopReady(time.Now()) != item {
		t.Fatal("ready item missing")
	}
	if h.Register(&PingItem{ProductID: 1}) {
		t.Fatal("duplicate in-flight product registered")
	}
	item.NextPingAt = time.Now().Add(time.Hour)
	h.SafePush(item)
	if h.PopReady(time.Now()) != nil {
		t.Fatal("popped future item")
	}
}
func BenchmarkRegister10000(b *testing.B) {
	h := NewPingHeap()
	for i := uint(0); i < 10000; i++ {
		h.Register(&PingItem{ProductID: i})
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		h.Register(&PingItem{ProductID: 9999})
	}
}

// Baseline: the original membership method scanned the locked heap.
func BenchmarkLegacyMembership10000(b *testing.B) {
	h := NewPingHeap()
	for i := uint(0); i < 10000; i++ {
		h.Register(&PingItem{ProductID: i})
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		h.mutex.RLock()
		for _, item := range h.items {
			if item.ProductID == 9999 {
				break
			}
		}
		h.mutex.RUnlock()
	}
}
