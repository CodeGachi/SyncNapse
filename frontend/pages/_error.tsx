import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0d0d0d',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0 }}>
        {statusCode || 'Error'}
      </h1>
      <p style={{ color: '#888', marginTop: '1rem' }}>
        {statusCode === 404
          ? 'Page not found'
          : 'An error occurred'}
      </p>
      <a
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#AFC02B',
          color: '#000',
          borderRadius: '0.75rem',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Go Home
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
