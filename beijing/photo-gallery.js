'use strict';

// Photos are local files. Attribution and source links are retained per photograph.
function renderPlacePhoto(place, index, onSelect) {
  const photo = place.photos?.[index];
  const image = document.getElementById('photo');
  const figure = image.closest('figure');
  figure.hidden = !photo;
  if (!photo) return;
  const credit = document.getElementById('credit');
  const caption = document.getElementById('photo-caption');
  const strip = document.getElementById('photo-thumbnails');
  const requiredCredit = document.getElementById('photo-required-credit');
  requiredCredit.replaceChildren();
  requiredCredit.hidden = !photo.creditExact;
  if (photo.creditExact) {
    const exactLink = document.createElement('a');
    exactLink.textContent = photo.creditExact;
    exactLink.href = photo.sourcePage; exactLink.target = '_blank'; exactLink.rel = 'noopener';
    requiredCredit.append(exactLink);
  }
  image.src = photo.src || photo.data;
  image.alt = photo.caption || photo.title || `${place.name} — фотография ${index + 1}`;
  image.decoding = 'async';
  if (photo.width && photo.height) {
    image.width = photo.width; image.height = photo.height;
  } else {
    image.removeAttribute('width'); image.removeAttribute('height');
  }
  caption.textContent = photo.caption || photo.title || '';
  caption.hidden = !caption.textContent;
  document.getElementById('photo-index').textContent = `${index + 1} / ${place.photos.length}`;
  document.getElementById('prev').disabled = place.photos.length < 2;
  document.getElementById('next').disabled = place.photos.length < 2;
  const link = (label, href) => {
    const a = document.createElement('a');
    a.textContent = label; a.href = href; a.target = '_blank'; a.rel = 'noopener';
    return a;
  };
  credit.replaceChildren();
  if (photo.author && photo.license && photo.licenseUrl) {
    credit.append(document.createTextNode(`Фото: ${photo.author} · `), link(photo.license, photo.licenseUrl));
    if (photo.sourcePage) credit.append(document.createTextNode(' · '), link(photo.sourcePage.includes('commons.wikimedia.org') ? 'Wikimedia Commons' : (photo.sourceProvider || 'Источник'), photo.sourcePage));
    if (photo.originalSource && /flickr\.com\//i.test(photo.originalSource)) {
      credit.append(document.createTextNode(' · '), link('Оригинал на Flickr', photo.originalSource));
    }
    if (photo.changes) {
      const changes = document.createElement('span'); changes.className = 'photo-changes';
      changes.textContent = photo.changes; credit.append(changes);
    }
  } else {
    credit.append(document.createTextNode((photo.credit || '') + ' · '),
      link('Источник фотографии', photo.filepage || photo.source));
  }
  // Rebuild only when changing places, retaining focus during gallery navigation.
  if (strip.dataset.place !== place.id) {
    strip.replaceChildren(); strip.dataset.place = place.id;
    place.photos.forEach((item, itemIndex) => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'photo-thumbnail';
      button.setAttribute('aria-label', `Фотография ${itemIndex + 1}: ${item.caption || item.title || place.name}`);
      const thumb = document.createElement('img');
      thumb.src = item.thumbnail || item.src || item.data;
      thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
      const number = document.createElement('span'); number.textContent = itemIndex + 1;
      button.append(thumb, number);
      button.addEventListener('click', () => onSelect(itemIndex));
      strip.append(button);
    });
  }
  strip.hidden = place.photos.length < 2;
  [...strip.children].forEach((button, itemIndex) => {
    button.setAttribute('aria-pressed', String(itemIndex === index));
  });
  const active = strip.children[index];
  if (active) {
    if (active.offsetLeft < strip.scrollLeft) strip.scrollLeft = active.offsetLeft;
    else if (active.offsetLeft + active.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = active.offsetLeft + active.offsetWidth - strip.clientWidth;
    }
  }
}
