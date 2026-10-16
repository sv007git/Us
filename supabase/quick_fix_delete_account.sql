-- ===================================================================
-- Just You & Me 💗 — Delete Account RPC & Table RLS DELETE Policies
-- Run this in your Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/pndjoveekfntcbskwbwq/sql/new
-- ===================================================================

-- 1. Stored Procedure: Permanently delete authenticated user and all their space data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_space_id UUID;
    v_other_members INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 1. Find the couple space the user belongs to
    SELECT couple_space_id INTO v_space_id
    FROM public.couple_members
    WHERE user_id = v_user_id
    LIMIT 1;

    -- 2. If user belongs to a couple space, check whether other members exist
    IF v_space_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_other_members
        FROM public.couple_members
        WHERE couple_space_id = v_space_id AND user_id != v_user_id;

        -- If user is the only member or wiping the space, delete the space
        -- (Cascades to all messages, memories, love notes, invitations, watch sessions)
        IF v_other_members = 0 THEN
            DELETE FROM public.couple_spaces WHERE id = v_space_id;
        ELSE
            -- If partner remains, remove this user from membership
            DELETE FROM public.couple_members WHERE user_id = v_user_id;
        END IF;
    END IF;

    -- 3. Delete any spaces created by this user
    DELETE FROM public.couple_spaces WHERE created_by = v_user_id;

    -- 4. Delete user profile
    DELETE FROM public.profiles WHERE id = v_user_id;

    -- 5. Delete storage objects owned by this user
    BEGIN
        DELETE FROM storage.objects WHERE owner = v_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 6. Permanently delete from auth.users (frees the email address for new registration)
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ===================================================================
-- 2. Enable DELETE Row Level Security (RLS) Policies on All Tables
-- ===================================================================

-- Profiles: Users can delete their own profile
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- Couple Spaces: Users can delete their couple space
DROP POLICY IF EXISTS "Users can delete their couple space" ON public.couple_spaces;
CREATE POLICY "Users can delete their couple space"
    ON public.couple_spaces FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid() 
        OR public.is_couple_member(auth.uid(), id)
    );

-- Couple Members: Users can delete their membership or members in their space
DROP POLICY IF EXISTS "Users can delete couple members" ON public.couple_members;
CREATE POLICY "Users can delete couple members"
    ON public.couple_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() 
        OR public.is_couple_member(auth.uid(), couple_space_id)
        OR EXISTS (
            SELECT 1 FROM public.couple_spaces 
            WHERE id = couple_members.couple_space_id AND created_by = auth.uid()
        )
    );

-- Invitations: Space members or creator can delete invitations
DROP POLICY IF EXISTS "Invitations deletable by creator or space members" ON public.invitations;
CREATE POLICY "Invitations deletable by creator or space members"
    ON public.invitations FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid() 
        OR public.is_couple_member(auth.uid(), couple_space_id)
    );

-- Messages: Sender or space members can delete messages
DROP POLICY IF EXISTS "Messages deletable by original sender" ON public.messages;
DROP POLICY IF EXISTS "Messages deletable by space members or sender" ON public.messages;
CREATE POLICY "Messages deletable by space members or sender"
    ON public.messages FOR DELETE
    TO authenticated
    USING (
        sender_id = auth.uid() 
        OR public.is_couple_member(auth.uid(), couple_space_id)
    );

-- Memories: Creator or space members can delete memories
DROP POLICY IF EXISTS "Memories deletable by creator" ON public.memories;
DROP POLICY IF EXISTS "Memories deletable by space members or creator" ON public.memories;
CREATE POLICY "Memories deletable by space members or creator"
    ON public.memories FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid() 
        OR public.is_couple_member(auth.uid(), couple_space_id)
    );

-- Love Notes: Author or space members can delete love notes
DROP POLICY IF EXISTS "Love notes deletable by author" ON public.love_notes;
DROP POLICY IF EXISTS "Love notes deletable by space members or author" ON public.love_notes;
CREATE POLICY "Love notes deletable by space members or author"
    ON public.love_notes FOR DELETE
    TO authenticated
    USING (
        author_id = auth.uid() 
        OR public.is_couple_member(auth.uid(), couple_space_id)
    );

-- Watch Sessions: Space members can delete watch sessions
DROP POLICY IF EXISTS "Watch sessions deletable by space members" ON public.watch_sessions;
CREATE POLICY "Watch sessions deletable by space members"
    ON public.watch_sessions FOR DELETE
    TO authenticated
    USING (
        public.is_couple_member(auth.uid(), couple_space_id)
        OR EXISTS (
            SELECT 1 FROM public.couple_spaces 
            WHERE id = watch_sessions.couple_space_id AND created_by = auth.uid()
        )
    );
