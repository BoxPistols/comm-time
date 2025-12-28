export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Comm Time Private API',
    description: 'Comm TimeアプリケーションのプライベートAPI。TODO、メモ、タグのデータにアクセスできます。',
    version: '1.0.0',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabaseのアクセストークン',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'プライベートAPIキー',
      },
      userIdHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-User-Id',
        description: 'ユーザーID (API Key認証時に必要)',
      },
    },
    schemas: {
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          text: { type: 'string', description: 'タスクの内容' },
          is_completed: { type: 'boolean', default: false },
          due_date: { type: 'string', format: 'date', nullable: true },
          due_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$', nullable: true },
          alarm_point_id: { type: 'string', nullable: true },
          order_index: { type: 'integer' },
          tag_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low', 'none'],
            default: 'none',
          },
          importance: {
            type: 'string',
            enum: ['high', 'medium', 'low', 'none'],
            default: 'none',
          },
          kanban_status: {
            type: 'string',
            enum: ['backlog', 'todo', 'doing', 'done'],
            default: 'backlog',
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Memo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', description: 'メモのタイトル' },
          content: { type: 'string', description: 'メモの内容 (Markdown対応)' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Tag: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', description: 'タグ名' },
          color: { type: 'string', description: 'Tailwind CSSカラークラス', default: 'bg-blue-500' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
    parameters: {
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        description: '取得件数',
      },
      offsetParam: {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer', minimum: 0, default: 0 },
        description: 'オフセット',
      },
      orderParam: {
        name: 'order',
        in: 'query',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        description: 'ソート順序',
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { apiKeyAuth: [], userIdHeader: [] },
  ],
  paths: {
    '/todos': {
      get: {
        tags: ['Todos'],
        summary: 'TODO一覧を取得',
        parameters: [
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['created_at', 'updated_at', 'order_index', 'due_date'],
              default: 'order_index',
            },
          },
          { $ref: '#/components/parameters/orderParam' },
          {
            name: 'is_completed',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false', 'all'] },
          },
          {
            name: 'kanban_status',
            in: 'query',
            schema: { type: 'string', enum: ['backlog', 'todo', 'doing', 'done', 'all'] },
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['high', 'medium', 'low', 'none', 'all'] },
          },
          {
            name: 'tag_id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'タグIDでフィルター',
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Todo' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '401': {
            description: '認証エラー',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Todos'],
        summary: 'TODOを作成',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', description: 'タスクの内容' },
                  is_completed: { type: 'boolean', default: false },
                  due_date: { type: 'string', format: 'date' },
                  due_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                  importance: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                  kanban_status: { type: 'string', enum: ['backlog', 'todo', 'doing', 'done'] },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todo: { $ref: '#/components/schemas/Todo' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/todos/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Todos'],
        summary: '特定のTODOを取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todo: { $ref: '#/components/schemas/Todo' },
                  },
                },
              },
            },
          },
          '404': {
            description: '見つからない',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Todos'],
        summary: 'TODOを更新',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  is_completed: { type: 'boolean' },
                  due_date: { type: 'string', format: 'date', nullable: true },
                  due_time: { type: 'string', nullable: true },
                  tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                  importance: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                  kanban_status: { type: 'string', enum: ['backlog', 'todo', 'doing', 'done'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todo: { $ref: '#/components/schemas/Todo' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Todos'],
        summary: 'TODOを削除',
        responses: {
          '200': {
            description: '削除成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/memos': {
      get: {
        tags: ['Memos'],
        summary: 'メモ一覧を取得',
        parameters: [
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['created_at', 'updated_at', 'title'],
              default: 'updated_at',
            },
          },
          { $ref: '#/components/parameters/orderParam' },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'タイトル・内容で検索',
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    memos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Memo' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Memos'],
        summary: 'メモを作成',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', default: '' },
                  content: { type: 'string', default: '' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    memo: { $ref: '#/components/schemas/Memo' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/memos/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Memos'],
        summary: '特定のメモを取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    memo: { $ref: '#/components/schemas/Memo' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Memos'],
        summary: 'メモを更新',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    memo: { $ref: '#/components/schemas/Memo' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Memos'],
        summary: 'メモを削除',
        responses: {
          '200': {
            description: '削除成功',
          },
        },
      },
    },
    '/tags': {
      get: {
        tags: ['Tags'],
        summary: 'タグ一覧を取得',
        parameters: [
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['created_at', 'updated_at', 'name'],
              default: 'name',
            },
          },
          { $ref: '#/components/parameters/orderParam' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tags: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Tag' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tags'],
        summary: 'タグを作成',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: 'タグ名' },
                  color: {
                    type: 'string',
                    default: 'bg-blue-500',
                    description: 'Tailwind CSSカラークラス',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tags/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Tags'],
        summary: '特定のタグを取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Tags'],
        summary: 'タグを更新',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tags'],
        summary: 'タグを削除',
        description: '関連するTODOからもタグIDが自動的に削除されます',
        responses: {
          '200': {
            description: '削除成功',
          },
        },
      },
    },
  },
}
