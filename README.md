# OpsBuddy

<img width="1188" height="591" alt="image" src="https://github.com/user-attachments/assets/66fb4597-e8b2-4162-af7e-3900def2a591" />

Nodejs Proto generation

```bash
#in /sdk
protoc \
  --plugin=./nodejs/node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./nodejs/src/proto \
  --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js \
  -I ./proto \
  ./proto/ingestion.proto
```

Go Proto generation

```bash
# in /sdk/go
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --js_out=import_style=commonjs,binary:../ts --ts_out=../ts --proto_path=../proto ../proto/ingestion.proto
```
