from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

router = APIRouter()


class MetadataOut(BaseModel):
    title: str | None = None
    description: str | None = None
    image: str | None = None
    price: float | None = None


@router.get("/metadata/test")
def metadata_test():
    return {"ok": True, "service": "metadata"}


@router.get("/metadata/fetch", response_model=MetadataOut)
def fetch_metadata(url: str = Query(..., description="URL to fetch metadata for")):
    try:
        # Use a common browser user-agent to get richer responses from sites like Amazon
        headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"}
        resp = requests.get(url, timeout=8, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch url: {e}")
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"Bad response fetching url: {resp.status_code}")
    soup = BeautifulSoup(resp.text, "html.parser")
    # title
    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    # description - og:description then meta[name=description]
    description = None
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        description = og_desc["content"].strip()
    else:
        mdesc = soup.find("meta", attrs={"name": "description"})
        if mdesc and mdesc.get("content"):
            description = mdesc["content"].strip()
    # price - start as None
    price = None
    # image - og:image
    image = None
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        image = urljoin(url, og_image["content"].strip())
    else:
        # try twitter image
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            image = urljoin(url, tw["content"].strip())

    # Try to parse JSON-LD structured data for better image/price extraction
    try:
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(s.string or "{}")
            except Exception:
                continue
            # If it's a product schema, extract offers and image
            if isinstance(data, dict):
                # image can be string or list
                if not image and data.get("image"):
                    if isinstance(data["image"], list):
                        image = urljoin(url, data["image"][0])
                    else:
                        image = urljoin(url, str(data["image"]))
                offers = data.get("offers")
                if offers:
                    # offers may be dict or list
                    if isinstance(offers, dict):
                        amt = offers.get("price") or offers.get("priceSpecification", {}).get("price")
                        if amt:
                            try:
                                price = float(amt)
                            except Exception:
                                price = None
                            if price is not None:
                                break
                    elif isinstance(offers, list):
                        for off in offers:
                            amt = off.get("price") if isinstance(off, dict) else None
                            if amt:
                                try:
                                    price = float(amt)
                                    break
                                except Exception:
                                    continue
            # If JSON-LD is a list, iterate
            if isinstance(data, list):
                for el in data:
                    if not image and el.get("image"):
                        if isinstance(el["image"], list):
                            image = urljoin(url, el["image"][0])
                        else:
                            image = urljoin(url, str(el["image"]))
                    offers = el.get("offers")
                    if offers:
                        if isinstance(offers, dict):
                            amt = offers.get("price")
                            if amt:
                                try:
                                    price = float(amt)
                                    break
                                except Exception:
                                    continue
                        elif isinstance(offers, list):
                            for off in offers:
                                amt = off.get("price") if isinstance(off, dict) else None
                                if amt:
                                    try:
                                        price = float(amt)
                                        break
                                    except Exception:
                                        continue
    except Exception:
        pass

    # Site-specific heuristics
    try:
        host = url.split('/')[2].lower()
    except Exception:
        host = ''

    # Amazon heuristics
    if 'amazon.' in host:
        try:
            # product title element
            pt = soup.find(id='productTitle')
            if pt and not title:
                title = pt.get_text(strip=True)
            # images: data-a-dynamic-image or img#landingImage
            img = None
            imgtag = soup.find(id='imgTagWrapperId')
            if imgtag:
                img_el = imgtag.find('img')
                if img_el:
                    # data-a-dynamic-image contains JSON mapping
                    dynamic = img_el.get('data-a-dynamic-image') or img_el.get('data-old-hires')
                    if dynamic:
                        try:
                            import json
                            j = json.loads(dynamic)
                            if isinstance(j, dict):
                                urls = list(j.keys())
                                if urls:
                                    img = urls[0]
                        except Exception:
                            pass
                    if not img:
                        src = img_el.get('src')
                        if src:
                            img = src
            # alternative landingImage
            if not img:
                landing = soup.find(id='landingImage')
                if landing and landing.get('data-old-hires'):
                    img = landing.get('data-old-hires')
                elif landing and landing.get('src'):
                    img = landing.get('src')
            if img:
                image = urljoin(url, img)
            # price selectors
            for pid in ('priceblock_ourprice', 'priceblock_dealprice', 'priceblock_saleprice'):
                p = soup.find(id=pid)
                if p and p.get_text():
                    txt = p.get_text().strip()
                    import re
                    m = re.search(r"[0-9]+[\.,]?[0-9]*", txt)
                    if m:
                        try:
                            price = float(m.group(0).replace(',', '.'))
                            break
                        except Exception:
                            pass
        except Exception:
            pass

    # Bol.com heuristics
    if 'bol.com' in host:
        try:
            # bol uses json-ld and og tags, but try selectors
            if not image:
                og = soup.find('meta', property='og:image')
                if og and og.get('content'):
                    image = urljoin(url, og['content'].strip())
            if not price:
                # bol price inside meta or data-attributes
                meta_price = soup.find('meta', attrs={'name': 'price'}) or soup.find('meta', property='product:price:amount')
                if meta_price and meta_price.get('content'):
                    try:
                        price = float(meta_price['content'].strip().replace(',', '.'))
                    except Exception:
                        price = None
        except Exception:
            pass

    # Vinted heuristics
    if 'vinted.' in host:
        try:
            if not image:
                og = soup.find('meta', property='og:image')
                if og and og.get('content'):
                    image = urljoin(url, og['content'].strip())
            if not description:
                ogd = soup.find('meta', property='og:description')
                if ogd and ogd.get('content'):
                    description = ogd['content'].strip()
            # price often in meta or visible span
            if not price:
                import re
                txt = soup.get_text()
                m = re.search(r"€\s*[0-9]+[\.,]?[0-9]*", txt)
                if m:
                    try:
                        price = float(m.group(0).replace('€', '').replace(',', '.').strip())
                    except Exception:
                        price = None
        except Exception:
            pass

    # Generic price search in page text if still missing
    if price is None:
        try:
            import re
            txt = soup.get_text()
            m = re.search(r"[€$]\s*[0-9]+[\.,]?[0-9]*", txt)
            if m:
                s = m.group(0).replace('€', '').replace('$', '').replace(',', '.').strip()
                try:
                    price = float(s)
                except Exception:
                    price = None
        except Exception:
            pass
    # price - attempt common meta tags if still missing
    if price is None:
        price_meta = soup.find("meta", property="product:price:amount") or soup.find("meta", attrs={"name": "price"})
        if price_meta and price_meta.get("content"):
            try:
                price = float(price_meta["content"].strip())
            except Exception:
                price = None
    return MetadataOut(title=title, description=description, image=image, price=price)
