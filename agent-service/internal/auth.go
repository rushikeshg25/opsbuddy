package internal

import (
	"errors"
	"fmt"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

// Claims mirrors the token issued by the http service (see
// http/internal/service/jwt.go). UserID is the stringified users.id.
type Claims struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	jwt.RegisteredClaims
}

func ValidateJWT(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_SECRET environment variable is not set")
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}
