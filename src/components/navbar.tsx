import { useStore } from '@nanostores/react';
import { cartStore, getItemCount } from '../lib/cart';
import SearchBox from './search/SearchBox';

const Navbar = () => {
  const cart = useStore(cartStore);
  const itemCount = getItemCount(cart);

  return (
    <nav className="navbar navbar-expand-lg blur border-radius-sm top-0 z-index-3 shadow position-sticky py-3 start-0 end-0">
      <div className="container px-1">
        <a
          className="navbar-brand ms-lg-0 "
          href={`${import.meta.env.BASE_URL}`}
          style={{ fontFamily: "'Sansita', sans-serif", fontWeight: 700, fontSize: '2.625rem' }}
        >
          Orchid Insanit<span style={{ display: 'inline-block', transform: 'rotate(20deg)', marginLeft: '0.07em', position: 'relative', top: '0.1em' }}>y</span>
        </a>
        <button className="navbar-toggler shadow-none ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#navigation" aria-controls="navigation" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon mt-2">
            <span className="navbar-toggler-bar bar1"></span>
            <span className="navbar-toggler-bar bar2"></span>
            <span className="navbar-toggler-bar bar3"></span>
          </span>
        </button>
        <div className="collapse navbar-collapse" id="navigation">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}`}>
                Home
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}shop/`}>
                Shop
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}articles/`}>
                Blog &amp; Articles
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}growing-instructions/`}>
                Growing Instructions
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}faq/`}>
                FAQ
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-1 " aria-current="page" href={`${import.meta.env.BASE_URL}contact/`}>
                Contact
              </a>
            </li>
            <li className="nav-item d-flex align-items-center">
              <SearchBox />
            </li>
            <li className="nav-item">
              <a className="nav-link text-dark font-weight-bold d-flex align-items-center me-2 position-relative" aria-current="page" href={`${import.meta.env.BASE_URL}shopping-cart/`}>
                <i className="bi bi-cart3 text-lg"></i>
                {(itemCount > 0) &&
                  <span
                    className="badge rounded-pill position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.65rem', backgroundColor: '#dc3545', color: '#fff' }}
                  >
                    {itemCount}
                  </span>
                }
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
