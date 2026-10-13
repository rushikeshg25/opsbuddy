package internal

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestHealthCheckReusesConnections(t *testing.T) {
	var connections atomic.Int32
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("healthy")) }))
	server.Config.ConnState = func(_ net.Conn, state http.ConnState) {
		if state == http.StateNew {
			connections.Add(1)
		}
	}
	server.Start()
	defer server.Close()
	client := &http.Client{Transport: newHealthTransport(4)}
	defer client.CloseIdleConnections()
	ps := &PingService{ctx: context.Background(), httpClient: client}
	for i := 0; i < 10; i++ {
		if !ps.performHealthCheck(server.URL) {
			t.Fatal("health check failed")
		}
	}
	if connections.Load() != 1 {
		t.Fatalf("opened %d connections; want 1", connections.Load())
	}
}
