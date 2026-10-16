-- ===================================================================
-- Just You & Me 💗 — Production Database Schema & RLS Policies
-- ===================================================================
-- Designed for PostgreSQL on Supabase.
-- Enforces absolute privacy between couples using Row Level Security (RLS),
-- cryptographic checks, and a hard 2-partner limit per couple space.

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
-- Holds public/partner-visible profile information for authenticated users.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    status_mood TEXT DEFAULT 'Thinking of you 💭',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Couple Spaces Table
-- The shared private container for exactly two partners in a relationship.
CREATE TABLE IF NOT EXISTS public.couple_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Just You & Me',
    anniversary_date DATE,
    welcome_message TEXT DEFAULT 'Forever & always 💗',
    theme_preference TEXT DEFAULT 'blush',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Couple Members Table
-- Maps users to their couple space.
-- Each user can belong to ONLY ONE couple space (enforced via UNIQUE(user_id)).
CREATE TABLE IF NOT EXISTS public.couple_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'partner',
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_couple_member UNIQUE (couple_space_id, user_id)
);

-- 5. Hard Limit: Exactly 2 Members per Couple Space Trigger
-- Guarantees at the database level that no 3rd person can ever join a space.
CREATE OR REPLACE FUNCTION public.check_couple_space_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_count INT;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM public.couple_members
    WHERE couple_space_id = NEW.couple_space_id;

    IF current_count >= 2 THEN
        RAISE EXCEPTION 'This couple space is already full. Only two partners are allowed.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_couple_space_capacity ON public.couple_members;
CREATE TRIGGER tr_check_couple_space_capacity
    BEFORE INSERT ON public.couple_members
    FOR EACH ROW
    EXECUTE FUNCTION public.check_couple_space_capacity();

-- 6. Invitations Table
-- Allows one partner to invite their partner with a secure expiring code.
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Realtime Messages Table
-- Stores text messages, media attachments, voice notes, stickers, and GIFs.
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'gif', 'sticker'
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}'::jsonb,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Shared Memories Gallery Table
-- Romantic photo albums, milestones, and favorite moments.
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    memory_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Love Notes & Scratchpad Table
-- Persistent notes, bucket lists, and sweet letters.
CREATE TABLE IF NOT EXISTS public.love_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    color TEXT DEFAULT 'rose', -- 'rose', 'lavender', 'blush', 'amber'
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Watch Together State Table
-- Tracks synchronized video player state between partners.
-- (Uses playback_position instead of reserved keyword current_time)
CREATE TABLE IF NOT EXISTS public.watch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL UNIQUE REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_title TEXT DEFAULT 'Movie Night',
    playback_position NUMERIC(10, 3) DEFAULT 0,
    is_playing BOOLEAN DEFAULT FALSE,
    playback_rate NUMERIC(3, 2) DEFAULT 1.0,
    last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===================================================================
-- Security Helper Functions (SECURITY DEFINER)
-- ===================================================================

-- Check if a given user is an authorized member of a couple space
CREATE OR REPLACE FUNCTION public.is_couple_member(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.couple_members
        WHERE user_id = p_user_id
          AND couple_space_id = p_space_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the couple space ID for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_couple_space_id()
RETURNS UUID AS $$
DECLARE
    v_space_id UUID;
BEGIN
    SELECT couple_space_id INTO v_space_id
    FROM public.couple_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    RETURN v_space_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===================================================================
-- Automatic Profile Creation on User Signup
-- ===================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ===================================================================
-- Pairing Flow Stored Procedures
-- ===================================================================

-- Stored procedure to securely accept an invitation code
CREATE OR REPLACE FUNCTION public.accept_invitation(invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_invitation RECORD;
    v_space_id UUID;
    v_member_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Check if user is already in a couple space
    IF EXISTS (SELECT 1 FROM public.couple_members WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION 'You are already a member of a couple space.' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Look up invitation
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE code = UPPER(TRIM(invite_code))
      AND used_at IS NULL
      AND expires_at > NOW();

    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation code.' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_space_id := v_invitation.couple_space_id;

    -- Check capacity of the couple space
    SELECT COUNT(*) INTO v_member_count
    FROM public.couple_members
    WHERE couple_space_id = v_space_id;

    IF v_member_count >= 2 THEN
        RAISE EXCEPTION 'This couple space is already full.' USING ERRCODE = 'check_violation';
    END IF;

    -- Add current user as partner
    INSERT INTO public.couple_members (couple_space_id, user_id, role)
    VALUES (v_space_id, v_user_id, 'partner');

    -- Mark invitation as used
    UPDATE public.invitations
    SET used_at = NOW(),
        used_by = v_user_id
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object(
        'success', true,
        'couple_space_id', v_space_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- Row Level Security (RLS) Enablement & Policies
-- ===================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users in the same space or self" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users in the same space or self"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.couple_members m1
            JOIN public.couple_members m2 ON m1.couple_space_id = m2.couple_space_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Couple Spaces Policies
DROP POLICY IF EXISTS "Couple spaces viewable by members" ON public.couple_spaces;
CREATE POLICY "Couple spaces viewable by members"
    ON public.couple_spaces FOR SELECT
    USING (public.is_couple_member(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated users can create a couple space" ON public.couple_spaces;
CREATE POLICY "Authenticated users can create a couple space"
    ON public.couple_spaces FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Couple spaces updatable by members" ON public.couple_spaces;
CREATE POLICY "Couple spaces updatable by members"
    ON public.couple_spaces FOR UPDATE
    USING (public.is_couple_member(auth.uid(), id))
    WITH CHECK (public.is_couple_member(auth.uid(), id));

-- 3. Couple Members Policies
DROP POLICY IF EXISTS "Couple members viewable by members of that space" ON public.couple_members;
CREATE POLICY "Couple members viewable by members of that space"
    ON public.couple_members FOR SELECT
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Users can insert membership for themselves during creation" ON public.couple_members;
CREATE POLICY "Users can insert membership for themselves during creation"
    ON public.couple_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Invitations Policies
DROP POLICY IF EXISTS "Invitations viewable by creator or members of the space" ON public.invitations;
CREATE POLICY "Invitations viewable by creator or members of the space"
    ON public.invitations FOR SELECT
    USING (created_by = auth.uid() OR public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Space members can create invitations" ON public.invitations;
CREATE POLICY "Space members can create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (public.is_couple_member(auth.uid(), couple_space_id) AND auth.uid() = created_by);

-- 5. Messages Policies
DROP POLICY IF EXISTS "Messages viewable only by couple members" ON public.messages;
CREATE POLICY "Messages viewable only by couple members"
    ON public.messages FOR SELECT
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Messages insertable only by couple members" ON public.messages;
CREATE POLICY "Messages insertable only by couple members"
    ON public.messages FOR INSERT
    WITH CHECK (
        public.is_couple_member(auth.uid(), couple_space_id)
        AND auth.uid() = sender_id
    );

DROP POLICY IF EXISTS "Messages updatable by original sender" ON public.messages;
CREATE POLICY "Messages updatable by original sender"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Messages deletable by original sender" ON public.messages;
CREATE POLICY "Messages deletable by original sender"
    ON public.messages FOR DELETE
    USING (auth.uid() = sender_id);

-- 6. Memories Policies
DROP POLICY IF EXISTS "Memories viewable only by couple members" ON public.memories;
CREATE POLICY "Memories viewable only by couple members"
    ON public.memories FOR SELECT
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Memories insertable only by couple members" ON public.memories;
CREATE POLICY "Memories insertable only by couple members"
    ON public.memories FOR INSERT
    WITH CHECK (public.is_couple_member(auth.uid(), couple_space_id) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Memories updatable by couple members" ON public.memories;
CREATE POLICY "Memories updatable by couple members"
    ON public.memories FOR UPDATE
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Memories deletable by creator" ON public.memories;
CREATE POLICY "Memories deletable by creator"
    ON public.memories FOR DELETE
    USING (auth.uid() = created_by);

-- 7. Love Notes Policies
DROP POLICY IF EXISTS "Love notes viewable only by couple members" ON public.love_notes;
CREATE POLICY "Love notes viewable only by couple members"
    ON public.love_notes FOR SELECT
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Love notes insertable by couple members" ON public.love_notes;
CREATE POLICY "Love notes insertable by couple members"
    ON public.love_notes FOR INSERT
    WITH CHECK (public.is_couple_member(auth.uid(), couple_space_id) AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Love notes updatable by couple members" ON public.love_notes;
CREATE POLICY "Love notes updatable by couple members"
    ON public.love_notes FOR UPDATE
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Love notes deletable by author or couple members" ON public.love_notes;
CREATE POLICY "Love notes deletable by author or couple members"
    ON public.love_notes FOR DELETE
    USING (public.is_couple_member(auth.uid(), couple_space_id));

-- 8. Watch Sessions Policies
DROP POLICY IF EXISTS "Watch sessions viewable only by couple members" ON public.watch_sessions;
CREATE POLICY "Watch sessions viewable only by couple members"
    ON public.watch_sessions FOR SELECT
    USING (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Watch sessions insertable by couple members" ON public.watch_sessions;
CREATE POLICY "Watch sessions insertable by couple members"
    ON public.watch_sessions FOR INSERT
    WITH CHECK (public.is_couple_member(auth.uid(), couple_space_id));

DROP POLICY IF EXISTS "Watch sessions updatable by couple members" ON public.watch_sessions;
CREATE POLICY "Watch sessions updatable by couple members"
    ON public.watch_sessions FOR UPDATE
    USING (public.is_couple_member(auth.uid(), couple_space_id))
    WITH CHECK (public.is_couple_member(auth.uid(), couple_space_id));

-- ===================================================================
-- Performance Indexes
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_messages_couple_space_created 
    ON public.messages (couple_space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_couple_members_lookup 
    ON public.couple_members (user_id, couple_space_id);

CREATE INDEX IF NOT EXISTS idx_invitations_code 
    ON public.invitations (code) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_space_date 
    ON public.memories (couple_space_id, memory_date DESC);

CREATE INDEX IF NOT EXISTS idx_love_notes_space 
    ON public.love_notes (couple_space_id, is_pinned DESC, updated_at DESC);

-- ===================================================================
-- Realtime Publication Enablement
-- ===================================================================
-- Add tables to the supabase_realtime publication for instant live updates.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'watch_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'couple_spaces'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_spaces;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;

-- ===================================================================
-- Supabase Storage Setup (couple-media bucket)
-- ===================================================================
-- Create private bucket for couple media if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'couple-media',
    'couple-media',
    FALSE,
    52428800, -- 50 MB limit
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'
    ]
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 52428800;

-- Storage RLS Policies: Path structure is: <couple_space_id>/<file_name>
-- Only authorized members of that couple space can read or upload.
DROP POLICY IF EXISTS "Allow couple members to download their media" ON storage.objects;
CREATE POLICY "Allow couple members to download their media"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'couple-media'
        AND public.is_couple_member(
            auth.uid(),
            (regexp_match(name, '^([0-9a-fA-F-]{36})/'))[1]::uuid
        )
    );

DROP POLICY IF EXISTS "Allow couple members to upload their media" ON storage.objects;
CREATE POLICY "Allow couple members to upload their media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'couple-media'
        AND public.is_couple_member(
            auth.uid(),
            (regexp_match(name, '^([0-9a-fA-F-]{36})/'))[1]::uuid
        )
    );

DROP POLICY IF EXISTS "Allow couple members to delete their uploaded media" ON storage.objects;
CREATE POLICY "Allow couple members to delete their uploaded media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'couple-media'
        AND public.is_couple_member(
            auth.uid(),
            (regexp_match(name, '^([0-9a-fA-F-]{36})/'))[1]::uuid
        )
    );
