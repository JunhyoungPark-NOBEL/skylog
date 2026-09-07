#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
parts=[]
for k in ['paths','missions','badges','quiz']:
    a=json.loads((ROOT/f'G5-learn-{k}.json').read_text())
    parts.append('```json\n'+json.dumps(a,ensure_ascii=False,indent=2)+'\n```')
# 정확히 4개 JSON 배열 코드 블록, 그 밖의 설명 없음.
(ROOT/'G5-learn-codeblocks.md').write_text('\n\n'.join(parts)+'\n')
q=json.loads((ROOT/'G5-learn-quiz.json').read_text())
text=['# G5 퀴즈 검토판','','출제용 JSON과 같은 100문항의 정답 확인용 보기입니다. 실제 학습 화면에는 정답을 선노출하지 않습니다.','']
for x in q:
    ans=x['choices'][x['answer']]['ko'] if x['type']=='mc' else ('참' if x['answer'] else '거짓') if x['type']=='trueFalse' else x['answer']
    text += [f"## {x['id']} · 난이도 {x['difficulty']} · {x['type']}",x['question']['ko'],'']
    if x['type']=='mc':text+=[' / '.join(f'{j+1}. {c["ko"]}' for j,c in enumerate(x['choices'])),'']
    text+=['**정답:** '+str(ans),x['explanation']['ko'],'']
(ROOT/'quiz-review.md').write_text('\n'.join(text)+'\n')
print('4 code blocks and quiz review written')
