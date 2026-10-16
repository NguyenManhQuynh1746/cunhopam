/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/chords',
        destination: '/hop-am',
        permanent: true,
      },
      {
        source: '/find',
        destination: '/tim-theo-hop-am',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
