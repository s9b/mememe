// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
  })
);

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    pathname: '/',
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  }),
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return children;
    },
  };
});

// Setup test environment
if (typeof window !== 'undefined') {
  // Setup a virtual DOM environment for tests
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };
}

// Mock environment variables
process.env = {
  ...process.env,
  OPENAI_API_KEY: 'test-openai-key',
  IMGFLIP_USER: 'test-imgflip-user',
  IMGFLIP_PASS: 'test-imgflip-pass',
  CLOUDINARY_CLOUD_NAME: 'test-cloud-name',
  CLOUDINARY_API_KEY: 'test-api-key',
  CLOUDINARY_API_SECRET: 'test-api-secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};