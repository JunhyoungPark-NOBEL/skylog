-- 공개 버킷을 쓰지 않는다. 이미지 접근은 게시물 RLS 검사 후 60초 URL로 제한한다.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sky-photos','sky-photos',false,3145728,array['image/jpeg']),
       ('sky-backups','sky-backups',false,20971520,array['application/json'])
on conflict(id) do nothing;
-- storage.objects에는 클라이언트 정책을 만들지 않는다. 검증된 Edge 함수만 서비스 역할로 접근한다.
