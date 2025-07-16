package service

import (
	"database/sql"
	"net/http"
	"os"

	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
)

type AuthController struct {
	db *sql.DB
}

func NewAuthController(db *sql.DB) *AuthController {
	return &AuthController{db: db}
}

func init() {
	goth.UseProviders(
		github.New(
			os.Getenv("GITHUB_CLIENT_ID"),
			os.Getenv("GITHUB_CLIENT_SECRET"),
			"http://localhost:8080/auth/github/callback", 
			"user:email",
		),
	)
}

func setupRoutes() {
	http.HandleFunc("/auth/github", func(w http.ResponseWriter, r *http.Request) {
		r.URL.Query().Add("provider", "github")
		gothic.BeginAuthHandler(w, r)
	})

	http.HandleFunc("/auth/github/callback", func(w http.ResponseWriter, r *http.Request) {
		_, err := gothic.CompleteUserAuth(w, r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write([]byte("Login successful!"))
	})
}
