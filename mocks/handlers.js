import {rest} from 'msw'

export const handlers = [
  // Handles a GET /addresses request
  rest.get('/addresses', (req, res, ctx) => {
    return res(
      ctx.delay(3000),
      ctx.status(200),
      ctx.json({
        data: [
          {
            code: 13,
            prefecture: 'Tokyo',
            city: 'Otaku',
            ward: 'Kamata',
          },
          {
            code: 12,
            prefecture: 'Osaka',
            city: 'Namba',
            ward: 'Suidou',
          },
          {
            code: 11,
            prefecture: 'Nagoya',
            city: 'Nagoya City',
            ward: 'Nagoya Ward',
          },
        ],
      }),
    )
  }),
]
