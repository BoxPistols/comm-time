const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // moduleNameMapper は解決後のパスではなく import 指定子に対して効くため、
    // 拡張子を持たない `swiper/css` 系のサブパスは既定の CSS パターンに掛からない
    '^swiper/css(/.*)?$': '<rootDir>/__mocks__/styleMock.js',
    // Mock CSS and markdown packages
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    'react-markdown': '<rootDir>/__mocks__/react-markdown.js',
    'remark-gfm': '<rootDir>/__mocks__/remark-gfm.js',
  },
  // ESM パッケージの変換除外は next.config.mjs の transpilePackages で指定する。
  // next/jest は自前の '/node_modules/' を先頭に置き、ここへの追記では上書きできないため
  // （transformIgnorePatterns は 1 つでも一致すれば変換されない）
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)