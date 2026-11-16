import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_CA_CERT: Joi.string().allow('').default(''),
  DATABASE_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(86_400)
    .default(3600),
  BCRYPT_COST: Joi.number().integer().min(10).max(15).default(12),
  EMAIL_VERIFICATION_TTL_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(24),
  PASSWORD_RESET_TTL_MINUTES: Joi.number()
    .integer()
    .min(5)
    .max(120)
    .default(30),

  INVITATION_TTL_DAYS: Joi.number().integer().min(1).max(30).default(7),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().required(),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().required(),

  CORS_ORIGINS: Joi.string().allow('').default(''),
});
