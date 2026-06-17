import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    print("Fetching feed...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    print("Parsing XML...")
    # Register namespaces to parse correctly
    # The atom feed namespace is http://www.w3.org/2005/Atom
    root = ET.fromstring(xml_data)
    
    # Atom namespace dictionary
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
                current_item['content_text'] += elem.get_text(strip=True) + ' '
                
        if current_item:
            items.append(current_item)
            
        # Clean text spacing
        for item in items:
            item['content_text'] = ' '.join(item['content_text'].split())
            
        entries.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_href,
            'items': items
        })
        
    print(f"Successfully parsed {len(entries)} entries.")
    # Print first entry items
    if entries:
        print("First entry items:")
        print(json.dumps(entries[0], indent=2))
        
except Exception as e:
    print(f"Error: {e}")
