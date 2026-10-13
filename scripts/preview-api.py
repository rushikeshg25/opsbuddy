#!/usr/bin/env python3
"""LOCAL UI FIXTURES ONLY. No production data, authentication, or persistence.
Run with python3 scripts/preview-api.py; start the UI with NEXT_PUBLIC_API_URL=http://localhost:8080.
"""
import json
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

NOW = datetime.now(timezone.utc)
def iso(days=0):
    return (NOW + timedelta(days=days)).isoformat()
products = [dict(id=i+1, name=name, description=desc, health_api=f'https://{slug}.example.com/health', user_id=1, auth_token='preview-token-not-a-real-secret', created_at=iso(-45), updated_at=iso()) for i,(name,slug,desc) in enumerate([
    ('Payments API','payments','Checkout and payment processing'),('Identity service','identity','Authentication and session management'),('Event pipeline','events','Streaming events across your workspace'),('Notification service','notify','Email delivery and incident alerts'),('Search API','search','Fast discovery for your application'),('Media processor','media','Asset uploads and image processing'),('Analytics worker','analytics','Scheduled reports and aggregations')])]
class Handler(BaseHTTPRequestHandler):
    def send(self, payload, status=200):
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Access-Control-Allow-Origin','http://localhost:3100')
        self.send_header('Access-Control-Allow-Credentials','true')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())
    def do_OPTIONS(self): self.send({})
    def do_GET(self):
        url=urlparse(self.path); q=parse_qs(url.query); path=url.path
        pid=int(q.get('product_id',['1'])[0]); page=int(q.get('page',['1'])[0]); limit=int(q.get('limit',['50'])[0])
        if path=='/api/me': return self.send({'user_name':'Preview workspace'})
        if path=='/api/products': data=products
        elif path.startswith('/api/products/'):
            data=next((p for p in products if str(p['id'])==path.rsplit('/',1)[1]),None)
            if not data: return self.send({'error':'Service not found'},404)
        elif path=='/api/downtime': data=[dict(id=1,product_id=pid,start_time=iso(-.02),status='down',is_notification_sent=True)] if pid==3 else [dict(id=2,product_id=pid,start_time=iso(-2),end_time=iso(-1.99),status='up',is_notification_sent=True)]
        elif path=='/api/analytics/uptime': data=dict(product_id=pid,uptime_percentage=98.1 if pid==3 else 99.96,total_downtime_minutes=27 if pid==3 else 1,incident_count=1,period_start=iso(-30),period_end=iso())
        elif path=='/api/logs':
            entries=[dict(id=i,product_id=pid,Timestamp=iso(-i/86400),log_data=['[INFO] Request completed in 42 ms','[ERROR] Upstream connection timeout','{"level":"WARN","message":"Retry scheduled"}','null'][i%4]) for i in range((page-1)*limit,min(page*limit,125))]
            data=dict(logs=entries,total=125,page=page,limit=limit)
        elif path=='/api/quick-fixes': data=dict(quickfixes=[dict(id=1,product_id=pid,downtime_id=2,title='Check the upstream connection pool',description='Connection timeouts appeared before the incident. Inspect pool utilization and check whether connections return to the pool after a request.',created_at=iso(-2))],total=1,page=page,limit=limit)
        else: return self.send({'error':'Fixture route not found'},404)
        self.send({'data':data})
    def do_POST(self):
        if self.path=='/api/products':
            data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            product=dict(products[0],**data); product['id']=len(products)+1; products.append(product)
            return self.send({'data':product},201)
        self.send({})
print('Local fixture API at http://localhost:8080 — synthetic data only',flush=True)
HTTPServer(('127.0.0.1',8080),Handler).serve_forever()
