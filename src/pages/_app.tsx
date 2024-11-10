import '@/styles/globals.css';

import classNames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { AppProps } from 'next/app'
export default function App({ Component, pageProps }: AppProps) {
  const pathname = usePathname();
  return <>
    <nav className="navbar sticky-top navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <ul className="navbar-nav">
          <li className="nav-item">
            <Link className={
              classNames(
                'nav-link',
                {active: pathname === '/chart'}
              )
              } href="/chart">
              Chart
            </Link>
          </li>
          <li>
            <Link className={
              classNames(
                'nav-link',
                {active: pathname === '/parallel'}
              )
              } href="/parallel">
              Parallel
            </Link>
          </li>
        </ul>
      </div>
    </nav>
    <Component {...pageProps} />
  </>
}
