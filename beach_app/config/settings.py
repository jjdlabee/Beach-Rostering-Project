"""
Django settings for beach_app project.
Uses python-decouple for environment variable management.
"""

from pathlib import Path
from decouple import config
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='change-me-in-production')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',

    # Local apps
    'apps.workers',
    'apps.payroll',
    'apps.roster',
    'apps.sheds',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',        # for serving static files in production
    'corsheaders.middleware.CorsMiddleware',        # must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Use DATABASE_URL if Railway provides it, otherwise fall back to individual vars
DATABASE_URL = os.environ.get('DATABASE_URL')

# Database
if DATABASE_URL:
    import urllib.parse
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     url.path[1:],
            'USER':     url.username,
            'PASSWORD': url.password,
            'HOST':     url.hostname,
            'PORT':     url.port,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE':   'django.db.backends.postgresql',
            'NAME':     config('DB_NAME',     default='beach_app'),
            'USER':     config('DB_USER',     default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST':     config('DB_HOST',     default='localhost'),
            'PORT':     config('DB_PORT',     default='5432'),
        }
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/Port_of_Spain'
USE_I18N = True
USE_TZ = True


# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}


# ─── JWT ─────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}


# ─── CORS ────────────────────────────────────────────────────────────────────
# During development, allow the Vite dev server.
# In production, replace with your actual frontend domain.
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173',
    cast=lambda v: [s.strip() for s in v.split(',')],
)
CORS_ALLOW_CREDENTIALS = True


# ─── Shed Booking Pricing (TTD) ───────────────────────────────────────────────
SHED_BASE_PRICE          = config('SHED_BASE_PRICE',          default=200.00, cast=float)
SHED_ELECTRICITY_PRICE   = config('SHED_ELECTRICITY_PRICE',   default=50.00,  cast=float)
SHED_WASHROOM_PRICE      = config('SHED_WASHROOM_PRICE',      default=7.00,   cast=float)   # per person
SHED_FREE_VEHICLES       = config('SHED_FREE_VEHICLES',       default=5,      cast=int)
SHED_EXTRA_VEHICLE_PRICE = config('SHED_EXTRA_VEHICLE_PRICE', default=10.00,  cast=float)
SHED_PAYMENT_URL         = config('SHED_PAYMENT_URL',         default='',     cast=str)     # e.g. WiPay link

# ─── TT Payroll Constants ─────────────────────────────────────────────────────
# These live in settings so they can be updated without touching model code.
# National Insurance Scheme (NIS)
# Employee rate: 5.4% applied to insurable wages (capped at weekly ceiling).
# Ceiling: TTD 1,600/week — contributions are fixed at the ceiling amount for
# any gross above this value (IAN $1,629.75 and RICKY $1,619.50 both → $86.40).
NIS_EMPLOYEE_RATE             = config('NIS_EMPLOYEE_RATE',             default=0.054,   cast=float)  # 5.4%
NIS_EMPLOYER_RATE             = config('NIS_EMPLOYER_RATE',             default=0.05,    cast=float)  # 5.0%
NIS_INSURABLE_WAGE_CEILING    = config('NIS_INSURABLE_WAGE_CEILING',    default=1600.00, cast=float)  # TTD/week

# Health Surcharge (TTD) — flat weekly amounts per income band
# Weekly insurable wage thresholds and corresponding surcharges
# Source: T&T NIS / MoF published rates
HEALTH_SURCHARGE_WEEKLY_HIGH = config('HEALTH_SURCHARGE_WEEKLY_HIGH', default=8.25,   cast=float)
HEALTH_SURCHARGE_WEEKLY_LOW  = config('HEALTH_SURCHARGE_WEEKLY_LOW',  default=1.65,   cast=float)
HEALTH_SURCHARGE_THRESHOLD   = config('HEALTH_SURCHARGE_THRESHOLD',   default=469.99, cast=float)

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'