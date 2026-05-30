-- Add pond_workers table to allow many-to-many assignments between ponds and workers
CREATE TABLE IF NOT EXISTS pond_workers (
  pond_id integer NOT NULL,
  user_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (pond_id, user_id),
  FOREIGN KEY (pond_id) REFERENCES ponds(pond_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index for faster lookup by user
CREATE INDEX IF NOT EXISTS idx_pond_workers_user_id ON pond_workers(user_id);
