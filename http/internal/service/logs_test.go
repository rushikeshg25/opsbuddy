package service

import "testing"

func TestNormalizePagination(t *testing.T) {
	for _, c := range []struct{ limit, page, wantLimit, wantPage int }{{0, 0, 50, 1}, {-1, -1, 50, 1}, {1000000, 1000000000, 200, 100000}, {25, 2, 25, 2}} {
		l, p := NormalizePagination(c.limit, c.page)
		if l != c.wantLimit || p != c.wantPage {
			t.Fatalf("%+v: got %d/%d", c, l, p)
		}
	}
}
