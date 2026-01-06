CREATE TABLE "campaign" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_zh" varchar(100),
	"name_ru" varchar(100),
	"description" text,
	"type" varchar(30) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"budget_amount" numeric(12, 2),
	"spent_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "campaign_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"influencer_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"total_gmv" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coupon_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_instance_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"old_value" json,
	"new_value" json,
	"actor_id" integer,
	"actor_type" varchar(20),
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'UNUSED' NOT NULL,
	"used_at" timestamp with time zone,
	"used_order_id" integer,
	"source_type" varchar(30) NOT NULL,
	"source_id" varchar(100),
	"tags" json,
	"adjusted_valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_instance_state_consistency" CHECK (
    (status = 'USED' AND used_at IS NOT NULL AND used_order_id IS NOT NULL)
    OR (status != 'USED' AND used_at IS NULL AND used_order_id IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "coupon_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_zh" varchar(100),
	"name_ru" varchar(100),
	"description" text,
	"type" varchar(30) NOT NULL,
	"discount_value" numeric(12, 2),
	"rule_json" json,
	"scope_type" varchar(20) DEFAULT 'ALL_STORES' NOT NULL,
	"scope_store_ids" json,
	"scope_category_ids" json,
	"scope_product_ids" json,
	"min_order_amount" numeric(12, 2),
	"max_discount_amount" numeric(12, 2),
	"max_usage_per_user" integer,
	"max_total_usage" integer,
	"current_usage_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stackable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_template_code_unique" UNIQUE("code"),
	CONSTRAINT "coupon_template_scope_consistency" CHECK (
    (scope_type = 'ALL_STORES' AND scope_store_ids IS NULL AND scope_category_ids IS NULL AND scope_product_ids IS NULL)
    OR (scope_type = 'STORES' AND scope_store_ids IS NOT NULL)
    OR (scope_type = 'CATEGORIES' AND scope_category_ids IS NOT NULL)
    OR (scope_type = 'PRODUCTS' AND scope_product_ids IS NOT NULL)
  ),
	CONSTRAINT "coupon_template_rule_json_consistency" CHECK (
    (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M') AND rule_json IS NOT NULL)
    OR (type IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND rule_json IS NULL)
  ),
	CONSTRAINT "coupon_template_discount_value_consistency" CHECK (
    (type IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND discount_value IS NOT NULL)
    OR (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M'))
  )
);
--> statement-breakpoint
CREATE TABLE "idempotency_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"result" json,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "iiko_sync_job" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_type" varchar(30) NOT NULL,
	"resource_id" varchar(100) NOT NULL,
	"action" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iiko_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"attempt_number" integer NOT NULL,
	"request_summary" text,
	"response_summary" text,
	"success" boolean NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "influencer" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(100) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"social_platform" varchar(30),
	"social_handle" varchar(100),
	"follower_count" integer,
	"commission_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"group_id" integer,
	"available_points_balance" integer DEFAULT 0 NOT NULL,
	"total_points_earned" integer DEFAULT 0 NOT NULL,
	"nickname" varchar(100),
	"avatar_url" text,
	"birthday" timestamp with time zone,
	"gender" varchar(10),
	"referral_code" varchar(20),
	"referred_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_phone_unique" UNIQUE("phone"),
	CONSTRAINT "member_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "member_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"name_zh" varchar(50),
	"name_ru" varchar(50),
	"level" integer DEFAULT 0 NOT NULL,
	"points_multiplier" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"min_points_required" integer DEFAULT 0 NOT NULL,
	"benefits" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_points_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"order_id" integer,
	"idempotency_key" varchar(255),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_scan_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_event_id" uuid NOT NULL,
	"campaign_code_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"cashier_id" integer,
	"scan_source" varchar(20) NOT NULL,
	"order_id" integer,
	"order_amount" numeric(12, 2),
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched" boolean DEFAULT false NOT NULL,
	"matched_at" timestamp with time zone,
	"match_method" varchar(20),
	"dup_count" integer DEFAULT 0 NOT NULL,
	"last_dup_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offline_scan_log_client_event_id_unique" UNIQUE("client_event_id"),
	CONSTRAINT "offline_scan_log_source_check" CHECK (
    scan_source IN ('POS', 'CASHIER_APP', 'ADMIN', 'QR')
  )
);
--> statement-breakpoint
CREATE TABLE "option_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(50) NOT NULL,
	"name_zh" varchar(50),
	"name_ru" varchar(50),
	"group_type" varchar(20) NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"selection_type" varchar(10) DEFAULT 'single' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_group_code_unique" UNIQUE("code"),
	CONSTRAINT "option_group_business_rule" CHECK (
    (group_type IN ('TEMPERATURE', 'ICE', 'SUGAR') AND is_required = true AND selection_type = 'single')
    OR
    (group_type = 'TOPPING' AND selection_type = 'multi')
  )
);
--> statement-breakpoint
CREATE TABLE "option_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(50) NOT NULL,
	"name_zh" varchar(50),
	"name_ru" varchar(50),
	"price_delta" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"member_id" integer,
	"store_id" integer NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"order_prefix" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"delivery_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"used_points" integer DEFAULT 0 NOT NULL,
	"points_discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"coupon_instance_id" integer,
	"coupon_discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"earned_points" integer DEFAULT 0 NOT NULL,
	"delivery_address" text,
	"delivery_latitude" numeric(10, 7),
	"delivery_longitude" numeric(10, 7),
	"delivery_note" text,
	"scheduled_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"payment_method" varchar(30),
	"payment_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"payment_transaction_id" varchar(100),
	"iiko_order_id" varchar(100),
	"iiko_sync_status" varchar(20),
	"campaign_code_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "order_points_coupon_mutual_exclusion" CHECK (
    NOT (used_points > 0 AND coupon_instance_id IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"is_special_price" boolean DEFAULT false NOT NULL,
	"options_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_option" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"option_group_code" varchar(30) NOT NULL,
	"option_group_name" varchar(50) NOT NULL,
	"option_item_code" varchar(30) NOT NULL,
	"option_item_name" varchar(50) NOT NULL,
	"price_delta" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_zh" varchar(200),
	"name_ru" varchar(200),
	"description" text,
	"description_zh" text,
	"description_ru" text,
	"base_price" numeric(12, 2) NOT NULL,
	"category_id" integer,
	"image_url" text,
	"thumbnail_url" text,
	"default_temperature" varchar(20),
	"default_ice_level" varchar(20),
	"default_sugar_level" varchar(20),
	"detail_content" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_special_price" boolean DEFAULT false NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"iiko_product_id" varchar(100),
	"iiko_last_sync_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "product_option_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"is_required" boolean,
	"selection_type" varchar(10),
	"default_item_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"price_delta_override" numeric(12, 2),
	"is_available_override" boolean,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"order_id" integer,
	"rating" integer NOT NULL,
	"content" text,
	"image_urls" json,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"admin_note" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_review_rating_check" CHECK (rating >= 1 AND rating <= 5)
);
--> statement-breakpoint
CREATE TABLE "review_like" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_price_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"actor_id" integer NOT NULL,
	"old_status" varchar(20),
	"new_status" varchar(20) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_price_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"original_price" numeric(12, 2) NOT NULL,
	"requested_price" numeric(12, 2) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"requester_id" integer NOT NULL,
	"request_reason" text,
	"approver_id" integer,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"activated_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_zh" varchar(100),
	"name_ru" varchar(100),
	"address" text,
	"city" varchar(50),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"phone" varchar(20),
	"email" varchar(320),
	"is_active" boolean DEFAULT true NOT NULL,
	"opening_hours" json,
	"iiko_terminal_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "store_product" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"price_override" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"stock_status" varchar(20) DEFAULT 'IN_STOCK' NOT NULL,
	"stock_quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(20),
	"login_method" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_code" ADD CONSTRAINT "campaign_code_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_code" ADD CONSTRAINT "campaign_code_influencer_id_influencer_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_audit_log" ADD CONSTRAINT "coupon_audit_log_coupon_instance_id_coupon_instance_id_fk" FOREIGN KEY ("coupon_instance_id") REFERENCES "public"."coupon_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_instance" ADD CONSTRAINT "coupon_instance_template_id_coupon_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."coupon_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_instance" ADD CONSTRAINT "coupon_instance_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iiko_sync_log" ADD CONSTRAINT "iiko_sync_log_job_id_iiko_sync_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."iiko_sync_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencer" ADD CONSTRAINT "influencer_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_group_id_member_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."member_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_points_history" ADD CONSTRAINT "member_points_history_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_scan_log" ADD CONSTRAINT "offline_scan_log_campaign_code_id_campaign_code_id_fk" FOREIGN KEY ("campaign_code_id") REFERENCES "public"."campaign_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_scan_log" ADD CONSTRAINT "offline_scan_log_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_scan_log" ADD CONSTRAINT "offline_scan_log_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_scan_log" ADD CONSTRAINT "offline_scan_log_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_item" ADD CONSTRAINT "option_item_group_id_option_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_coupon_instance_id_coupon_instance_id_fk" FOREIGN KEY ("coupon_instance_id") REFERENCES "public"."coupon_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_option" ADD CONSTRAINT "order_item_option_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group" ADD CONSTRAINT "product_option_group_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group" ADD CONSTRAINT "product_option_group_group_id_option_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_item" ADD CONSTRAINT "product_option_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_item" ADD CONSTRAINT "product_option_item_item_id_option_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."option_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_review_id_product_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."product_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_audit_log" ADD CONSTRAINT "special_price_audit_log_request_id_special_price_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."special_price_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_audit_log" ADD CONSTRAINT "special_price_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_request" ADD CONSTRAINT "special_price_request_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_request" ADD CONSTRAINT "special_price_request_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_request" ADD CONSTRAINT "special_price_request_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_price_request" ADD CONSTRAINT "special_price_request_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_status" ON "campaign" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_campaign_dates" ON "campaign" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_campaign_code_campaign_influencer" ON "campaign_code" USING btree ("campaign_id","influencer_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_code_campaign" ON "campaign_code" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_code_influencer" ON "campaign_code" USING btree ("influencer_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_audit_log_instance" ON "coupon_audit_log" USING btree ("coupon_instance_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_audit_log_action" ON "coupon_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_coupon_instance_member" ON "coupon_instance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_instance_template" ON "coupon_instance" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_instance_status" ON "coupon_instance" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coupon_instance_used_order_unique" ON "coupon_instance" USING btree ("used_order_id") WHERE used_order_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_coupon_template_valid" ON "coupon_template" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "idx_coupon_template_active" ON "coupon_template" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_idempotency_key_expires" ON "idempotency_key" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_iiko_sync_job_status" ON "iiko_sync_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_iiko_sync_job_resource" ON "iiko_sync_job" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_iiko_sync_job_retry" ON "iiko_sync_job" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_iiko_sync_job_priority" ON "iiko_sync_job" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_iiko_sync_job_running_unique" ON "iiko_sync_job" USING btree ("resource_type","resource_id") WHERE status = 'RUNNING';--> statement-breakpoint
CREATE INDEX "idx_iiko_sync_log_job" ON "iiko_sync_log" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_iiko_sync_log_job_attempt_unique" ON "iiko_sync_log" USING btree ("job_id","attempt_number");--> statement-breakpoint
CREATE INDEX "idx_influencer_status" ON "influencer" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_member_user_id" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_member_phone" ON "member" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_member_group_id" ON "member" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_points_history_member" ON "member_points_history" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_points_history_order" ON "member_points_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_points_history_reason" ON "member_points_history" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "idx_points_history_expires" ON "member_points_history" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_points_history_idempotency_unique" ON "member_points_history" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_code" ON "offline_scan_log" USING btree ("campaign_code_id");--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_store" ON "offline_scan_log" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_order" ON "offline_scan_log" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_matched" ON "offline_scan_log" USING btree ("matched","scanned_at");--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_source" ON "offline_scan_log" USING btree ("scan_source");--> statement-breakpoint
CREATE INDEX "idx_offline_scan_log_match_method" ON "offline_scan_log" USING btree ("match_method");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_offline_scan_log_code_order_unique" ON "offline_scan_log" USING btree ("campaign_code_id","order_id") WHERE order_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_option_item_group" ON "option_item" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_option_item_group_id" ON "option_item" USING btree ("group_id","id");--> statement-breakpoint
CREATE INDEX "idx_order_member" ON "order" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_order_store" ON "order" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_order_status" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_order_created" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_order_payment_status" ON "order" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "idx_order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_item_product" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_item_option_item" ON "order_item_option" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_phone" ON "phone_verification" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_phone_verification_expires" ON "phone_verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_product_category" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_active" ON "product" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_product_iiko" ON "product" USING btree ("iiko_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_option_group_unique" ON "product_option_group" USING btree ("product_id","group_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_group_product" ON "product_option_group" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_option_item_unique" ON "product_option_item" USING btree ("product_id","item_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_item_product" ON "product_option_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_review_product" ON "product_review" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_review_member" ON "product_review" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_product_review_status" ON "product_review" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_review_like_unique" ON "review_like" USING btree ("review_id","member_id");--> statement-breakpoint
CREATE INDEX "idx_special_price_audit_log_request" ON "special_price_audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_special_price_request_store" ON "special_price_request" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_special_price_request_product" ON "special_price_request" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_special_price_request_status" ON "special_price_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_store_city" ON "store" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_store_active" ON "store" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_store_product_unique" ON "store_product" USING btree ("store_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_store_product_store" ON "store_product" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_product_product" ON "store_product" USING btree ("product_id");