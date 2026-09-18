"""add conversions for aiatoz integration

Revision ID: a1b2c3d4e5f6
Revises: 550032697b3d
Create Date: 2026-09-15
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '550032697b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('conversions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('public_id', sa.String(length=36), nullable=False),
        sa.Column('conversion_id', sa.String(length=100), nullable=False),
        sa.Column('order_id', sa.String(length=100), nullable=False),
        sa.Column('affiliate_id', sa.Integer(), nullable=False),
        sa.Column('affiliate_link_id', sa.Integer(), nullable=True),
        sa.Column('referral_code', sa.String(length=80), nullable=False),
        sa.Column('customer_id', sa.String(length=100), nullable=True),
        sa.Column('product_id', sa.String(length=100), nullable=True),
        sa.Column('product_name', sa.String(length=200), nullable=True),
        sa.Column('sale_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('commission_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('commission_rule_id', sa.Integer(), nullable=True),
        sa.Column('percentage_snapshot', sa.Numeric(precision=7, scale=4), nullable=True),
        sa.Column('fixed_amount_snapshot', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'REVERSED', name='commissionstatus', native_enum=False), nullable=False),
        sa.Column('purchased_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reversed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reversal_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['affiliate_id'], ['affiliates.id'], ),
        sa.ForeignKeyConstraint(['affiliate_link_id'], ['affiliate_links.id'], ),
        sa.ForeignKeyConstraint(['commission_rule_id'], ['commission_rules.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversion_id'),
        sa.UniqueConstraint('order_id')
    )
    op.create_index(op.f('ix_conversions_affiliate_id'), 'conversions', ['affiliate_id'], unique=False)
    op.create_index(op.f('ix_conversions_affiliate_link_id'), 'conversions', ['affiliate_link_id'], unique=False)
    op.create_index(op.f('ix_conversions_conversion_id'), 'conversions', ['conversion_id'], unique=True)
    op.create_index(op.f('ix_conversions_currency'), 'conversions', ['currency'], unique=False)
    op.create_index(op.f('ix_conversions_order_id'), 'conversions', ['order_id'], unique=True)
    op.create_index(op.f('ix_conversions_public_id'), 'conversions', ['public_id'], unique=True)
    op.create_index(op.f('ix_conversions_purchased_at'), 'conversions', ['purchased_at'], unique=False)
    op.create_index(op.f('ix_conversions_referral_code'), 'conversions', ['referral_code'], unique=False)
    op.create_index(op.f('ix_conversions_status'), 'conversions', ['status'], unique=False)
    op.create_index('ix_conversions_affiliate_created', 'conversions', ['affiliate_id', 'created_at'], unique=False)
    op.create_index('ix_conversions_status_created', 'conversions', ['status', 'created_at'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_conversions_status_created', table_name='conversions')
    op.drop_index('ix_conversions_affiliate_created', table_name='conversions')
    op.drop_index(op.f('ix_conversions_status'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_referral_code'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_purchased_at'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_public_id'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_order_id'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_currency'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_conversion_id'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_affiliate_link_id'), table_name='conversions')
    op.drop_index(op.f('ix_conversions_affiliate_id'), table_name='conversions')
    op.drop_table('conversions')
