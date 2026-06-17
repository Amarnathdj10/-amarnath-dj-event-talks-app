import os
import time
import json
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "releases_cache.json"
CACHE_DURATION = 3600  # 1 hour in seconds

def fetch_and_parse_feed():
    req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title_el = entry.find('atom:title', ns)
        date_str = title_el.text if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', ns)
        updated_str = updated_el.text if updated_el is not None else ""
        
        link_el = entry.find('atom:link[@rel="alternate"]', ns)
        if link_el is None:
            link_el = entry.find('atom:link', ns)
        link_href = link_el.attrib.get('href', '') if link_el is not None else ""
        
        content_el = entry.find('atom:content', ns)
        content_html = content_el.text if content_el is not None else ""
        
        # Parse content_html
        soup = BeautifulSoup(content_html, 'html.parser')
        items = []
        current_item = None
        
        for elem in soup.contents:
            if hasattr(elem, 'name') and elem.name == 'h3':
                if current_item:
                    items.append(current_item)
                current_item = {
                    'type': elem.get_text(strip=True),
                    'content_html': '',
                    'content_text': ''
                }
            elif current_item is not None:
                current_item['content_html'] += str(elem)
                current_item['content_text'] += elem.get_text(separator=' ') + ' '
                
        if current_item:
            items.append(current_item)
            
        # Clean text spacing and assign ID
        for index, item in enumerate(items):
            item['content_text'] = ' '.join(item['content_text'].split())
            # Stable ID: date prefix, index, and hash of type + description
            item_hash = hash(item['type'] + item['content_text'][:20]) & 0xffffffff
            item['id'] = f"item_{updated_str[:10]}_{index}_{item_hash}"
            
        entries.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_href,
            'items': items
        })
        
    return entries

def get_releases(force_refresh=False):
    # Check if cache exists and is fresh
    if not force_refresh and os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        if time.time() - mtime < CACHE_DURATION:
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass  # Fallback to fetch if read fails
                
    # Fetch and cache
    try:
        entries = fetch_and_parse_feed()
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        return entries
    except Exception as e:
        # Fallback to stale cache if fetch fails
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    try:
        releases = get_releases(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'releases': releases,
            'source': 'network' if force_refresh else 'cache'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
