export default function Footer() {
  return (
    <>
      <footer className="footer pt-3  ">
        <div className="row align-items-center justify-content-lg-between">
          <div className="col-lg-6 mb-lg-0 mb-4">
            <div className="copyright text-center text-sm text-muted text-lg-start">
              Copyright ©{" "}
              <script>document.write(new Date().getFullYear())</script>
              &nbsp;Orchid Insanity.
            </div>
          </div>
          <div className="col-lg-6">
            <ul className="nav nav-footer justify-content-center justify-content-lg-end">
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}`}
                  className="nav-link text-sm text-muted"
                >
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}shop/`}
                  className="nav-link text-sm text-muted"
                >
                  Shop
                </a>
              </li>
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}articles/`}
                  className="nav-link text-sm text-muted"
                >
                  Blog &amp; Articles
                </a>
              </li>
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}growing-instructions/`}
                  className="nav-link text-sm text-muted"
                >
                  Growing Instructions
                </a>
              </li>
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}faq/`}
                  className="nav-link text-sm text-muted"
                >
                  FAQ
                </a>
              </li>
              <li className="nav-item">
                <a
                  href={`${import.meta.env.BASE_URL}contact/`}
                  className="nav-link text-sm pe-0 text-muted"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
