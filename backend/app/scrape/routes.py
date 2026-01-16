from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import httpx
from bs4 import BeautifulSoup
import re
import json
import logging

router = APIRouter(prefix="/scrape", tags=["scrape"])
logger = logging.getLogger(__name__)

# =====================================================
# SCHEMAS
# =====================================================

class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    success: bool
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None
    images: List[str] = []
    brand: Optional[str] = None
    availability: Optional[str] = None
    error: Optional[str] = None

# =====================================================
# SCRAPING HELPERS
# =====================================================

def clean_price(price_str: str) -> Optional[float]:
    """Nettoyer et convertir un prix en float"""
    if not price_str:
        return None
    # Supprimer tout sauf chiffres, virgules et points
    cleaned = re.sub(r'[^\d,.\s]', '', price_str)
    cleaned = cleaned.strip()
    if not cleaned:
        return None
    
    # Gérer les formats européens (1.234,56) et US (1,234.56)
    if ',' in cleaned and '.' in cleaned:
        if cleaned.rfind(',') > cleaned.rfind('.'):
            # Format européen: 1.234,56
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            # Format US: 1,234.56
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        # Pourrait être 1234,56 (européen) ou 1,234 (US)
        parts = cleaned.split(',')
        if len(parts) == 2 and len(parts[1]) == 2:
            cleaned = cleaned.replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None

def extract_json_ld(soup: BeautifulSoup) -> dict:
    """Extraire les données JSON-LD (schema.org)"""
    data = {}
    scripts = soup.find_all('script', type='application/ld+json')
    
    for script in scripts:
        try:
            json_data = json.loads(script.string)
            
            # Peut être une liste ou un dict
            if isinstance(json_data, list):
                for item in json_data:
                    if item.get('@type') == 'Product':
                        data = item
                        break
            elif json_data.get('@type') == 'Product':
                data = json_data
            elif '@graph' in json_data:
                for item in json_data['@graph']:
                    if item.get('@type') == 'Product':
                        data = item
                        break
        except (json.JSONDecodeError, TypeError):
            continue
    
    return data

def extract_opengraph(soup: BeautifulSoup) -> dict:
    """Extraire les métadonnées Open Graph"""
    data = {}
    
    og_tags = {
        'og:title': 'title',
        'og:description': 'description',
        'og:image': 'image',
        'og:price:amount': 'price',
        'og:price:currency': 'currency',
        'product:price:amount': 'price',
        'product:price:currency': 'currency',
    }
    
    for og_prop, key in og_tags.items():
        meta = soup.find('meta', property=og_prop)
        if meta and meta.get('content'):
            data[key] = meta['content']
    
    return data

def extract_meta_tags(soup: BeautifulSoup) -> dict:
    """Extraire les métadonnées standards"""
    data = {}
    
    # Title
    title_tag = soup.find('title')
    if title_tag:
        data['title'] = title_tag.get_text(strip=True)
    
    # Description
    desc_meta = soup.find('meta', attrs={'name': 'description'})
    if desc_meta and desc_meta.get('content'):
        data['description'] = desc_meta['content']
    
    return data

def extract_amazon(soup: BeautifulSoup, url: str) -> dict:
    """Extraction spécifique Amazon"""
    data = {}
    
    # Titre
    title_el = soup.find('span', id='productTitle')
    if title_el:
        data['title'] = title_el.get_text(strip=True)
    
    # Prix
    price_el = soup.find('span', class_='a-price-whole')
    if price_el:
        price_frac = soup.find('span', class_='a-price-fraction')
        price_str = price_el.get_text(strip=True)
        if price_frac:
            price_str += '.' + price_frac.get_text(strip=True)
        data['price'] = clean_price(price_str)
    
    # Image
    img_el = soup.find('img', id='landingImage')
    if img_el and img_el.get('src'):
        data['image'] = img_el['src']
    
    # Marque
    brand_el = soup.find('a', id='bylineInfo')
    if brand_el:
        data['brand'] = brand_el.get_text(strip=True).replace('Marque :', '').replace('Visite la boutique', '').strip()
    
    return data

def extract_cdiscount(soup: BeautifulSoup, url: str) -> dict:
    """Extraction spécifique Cdiscount"""
    data = {}
    
    title_el = soup.find('h1', class_='fpDesCol')
    if title_el:
        data['title'] = title_el.get_text(strip=True)
    
    price_el = soup.find('span', class_='hideFromPro')
    if price_el:
        data['price'] = clean_price(price_el.get_text())
    
    return data

def extract_fnac(soup: BeautifulSoup, url: str) -> dict:
    """Extraction spécifique Fnac"""
    data = {}
    
    title_el = soup.find('h1', class_='f-productHeader-Title')
    if title_el:
        data['title'] = title_el.get_text(strip=True)
    
    price_el = soup.find('span', class_='f-priceBox-price')
    if price_el:
        data['price'] = clean_price(price_el.get_text())
    
    return data

def extract_generic(soup: BeautifulSoup) -> dict:
    """Extraction générique pour sites non supportés"""
    data = {}
    
    # Chercher des prix
    price_patterns = [
        r'(\d+[.,]\d{2})\s*€',
        r'€\s*(\d+[.,]\d{2})',
        r'\$\s*(\d+[.,]\d{2})',
        r'(\d+[.,]\d{2})\s*\$',
        r'price["\s:]+(\d+[.,]\d{2})',
    ]
    
    text = soup.get_text()
    for pattern in price_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['price'] = clean_price(match.group(1))
            break
    
    # Chercher images de produit
    images = []
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if src and not any(x in src.lower() for x in ['logo', 'icon', 'banner', 'ad', 'tracking']):
            # Préférer les grandes images
            width = img.get('width', '')
            height = img.get('height', '')
            if str(width).isdigit() and int(width) > 200:
                images.insert(0, src)
            elif str(height).isdigit() and int(height) > 200:
                images.insert(0, src)
            else:
                images.append(src)
    
    if images:
        data['images'] = images[:5]  # Max 5 images
    
    return data

# =====================================================
# ROUTE PRINCIPALE
# =====================================================

@router.post("", response_model=ScrapeResponse)
async def scrape_url(payload: ScrapeRequest):
    """Récupérer les informations d'un produit depuis une URL"""
    url = payload.url
    
    # Valider l'URL
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Collecter les données de différentes sources
        json_ld = extract_json_ld(soup)
        og_data = extract_opengraph(soup)
        meta_data = extract_meta_tags(soup)
        
        # Extraction spécifique par site
        site_data = {}
        if 'amazon.' in url:
            site_data = extract_amazon(soup, url)
        elif 'cdiscount.' in url:
            site_data = extract_cdiscount(soup, url)
        elif 'fnac.' in url:
            site_data = extract_fnac(soup, url)
        else:
            site_data = extract_generic(soup)
        
        # Fusionner les données (priorité: site_data > json_ld > og_data > meta_data)
        result = ScrapeResponse(success=True, url=url)
        
        # Titre
        result.title = (
            site_data.get('title') or
            json_ld.get('name') or
            og_data.get('title') or
            meta_data.get('title')
        )
        if result.title:
            result.title = result.title[:256]  # Limiter la longueur
        
        # Description
        result.description = (
            site_data.get('description') or
            json_ld.get('description') or
            og_data.get('description') or
            meta_data.get('description')
        )
        if result.description:
            result.description = result.description[:1000]
        
        # Prix
        price = site_data.get('price')
        if not price and json_ld.get('offers'):
            offers = json_ld['offers']
            if isinstance(offers, list):
                offers = offers[0]
            if isinstance(offers, dict):
                price = clean_price(str(offers.get('price', '')))
        if not price:
            price = clean_price(og_data.get('price', ''))
        result.price = price
        
        # Currency
        result.currency = og_data.get('currency') or 'EUR'
        
        # Image
        result.image_url = (
            site_data.get('image') or
            json_ld.get('image') or
            og_data.get('image')
        )
        if isinstance(result.image_url, list):
            result.image_url = result.image_url[0] if result.image_url else None
        
        # Liste d'images
        result.images = site_data.get('images', [])
        if result.image_url and result.image_url not in result.images:
            result.images.insert(0, result.image_url)
        
        # Marque
        result.brand = site_data.get('brand') or json_ld.get('brand', {}).get('name')
        
        # Disponibilité
        if json_ld.get('offers'):
            offers = json_ld['offers']
            if isinstance(offers, list):
                offers = offers[0]
            if isinstance(offers, dict):
                avail = offers.get('availability', '')
                if 'InStock' in avail:
                    result.availability = 'En stock'
                elif 'OutOfStock' in avail:
                    result.availability = 'Rupture de stock'
        
        logger.info(f"Scrape successful: {url}")
        return result
        
    except httpx.TimeoutException:
        logger.warning(f"Scrape timeout: {url}")
        return ScrapeResponse(success=False, url=url, error="Délai d'attente dépassé")
    except httpx.HTTPStatusError as e:
        logger.warning(f"Scrape HTTP error: {url} - {e.response.status_code}")
        return ScrapeResponse(success=False, url=url, error=f"Erreur HTTP {e.response.status_code}")
    except Exception as e:
        logger.error(f"Scrape error: {url} - {str(e)}")
        return ScrapeResponse(success=False, url=url, error=str(e))
