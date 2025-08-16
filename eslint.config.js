const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/*.js',
      '**/*.d.ts',
      'tools/**',
      'coverage/**',
      'layer/**'
    ]
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import': importPlugin
    },
    rules: {
      // TypeScript-specific rules (matching MembershipApi)
      '@typescript-eslint/no-unused-vars': [
        'warn', 
        { 
          argsIgnorePattern: '^_|^req$|^res$|^au$|^ex$|^e$|^bind$|^next$',
          varsIgnorePattern: '^_|^start$|^result$|^app$|^interfaces$',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-inferrable-types': 'off',
      
      // General rules (matching MembershipApi)
      'no-console': 'error',
      'prefer-const': 'error',
      
      // Code style (enforced by Prettier, but useful for linting)
      'semi': ['error', 'always'],
      'quotes': ['error', 'double'],
      'comma-dangle': ['error', 'never'],

      // Module separation rules for CoreApis monolith
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './src/modules/attendance/**/*',
            from: './src/modules/!(attendance)/**/*',
            message: 'Attendance module should not import directly from other modules. Use shared interfaces or dependency injection.'
          },
          {
            target: './src/modules/content/**/*',
            from: './src/modules/!(content)/**/*',
            message: 'Content module should not import directly from other modules. Use shared interfaces or dependency injection.'
          },
          {
            target: './src/modules/doing/**/*',
            from: './src/modules/!(doing)/**/*',
            message: 'Doing module should not import directly from other modules. Use shared interfaces or dependency injection.'
          },
          {
            target: './src/modules/giving/**/*',
            from: './src/modules/!(giving)/**/*',
            message: 'Giving module should not import directly from other modules. Use shared interfaces or dependency injection.'
          },
          {
            target: './src/modules/membership/**/*',
            from: './src/modules/!(membership)/**/*',
            message: 'Membership module should not import directly from other modules. Use shared interfaces or dependency injection.'
          },
          {
            target: './src/modules/messaging/**/*',
            from: './src/modules/!(messaging)/**/*',
            message: 'Messaging module should not import directly from other modules. Use shared interfaces or dependency injection.'
          }
        ]
      }]
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        }
      }
    }
  },
  {
    // Special rules for files that need cross-module access
    files: [
      'src/app.ts', 
      'src/routes.ts',
      'src/lambda/**/*.ts',
      'src/shared/infrastructure/RepositoryManager.ts',
      'src/shared/helpers/StripeHelper.ts',
      'src/modules/*/index.ts'
    ],
    rules: {
      'import/no-restricted-paths': 'off'
    }
  },
  {
    // Allow console statements in lambda handlers and development files
    files: [
      'src/lambda/**/*.ts',
      'src/index.ts',
      'src/app.ts',
      'src/routes.ts',
      'src/shared/helpers/Environment.ts',
      'src/shared/infrastructure/**/*.ts',
      'src/modules/messaging/helpers/**/*.ts',
      'src/modules/content/controllers/**/*.ts'
    ],
    rules: {
      'no-console': 'off'
    }
  }
];