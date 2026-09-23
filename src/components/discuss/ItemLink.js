import React from 'react';
import { Link } from 'react-router-dom';
import { prefetchItem } from './discussApi';
import { useDiscussBase } from './paths';

// A link to an item page that fetches the page when the pointer arrives, so the click lands on
// a page already in memory. `to` defaults to the canonical URL.
function ItemLink({ slug, to, children, ...rest }) {
  const base = useDiscussBase();
  const warm = () => prefetchItem(slug);
  return (
    <Link to={to || `${base}/${slug}`} onMouseEnter={warm} onFocus={warm} {...rest}>
      {children}
    </Link>
  );
}

export default ItemLink;
