#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]

def obj(props,required=None):return {'type':'object','properties':props,'required':required or list(props),'additionalProperties':False}
def arr(item,lo=None,hi=None):
 d={'type':'array','items':item}
 if lo is not None:d['minItems']=lo
 if hi is not None:d['maxItems']=hi
 return d
ID={'type':'string','pattern':'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'}
OID={'type':'string','pattern':r'^(?:star:HIP[1-9][0-9]*|dso:[A-Za-z0-9+_-]+|planet:[a-z]+|const:[A-Z][A-Za-z]{2}|moon|sun)$'}
TEXT=obj({'ko':{'type':'string','minLength':1},'en':{'type':'string'}},['ko'])
LEVEL={'enum':['naked','binoculars','telescope']}; SEASON={'enum':['spring','summer','autumn','winter','any']}
NUM={'type':'integer','minimum':1}; DIFF={'type':'integer','enum':[1,2,3]}
CATEGORY={'enum':['planet','moon','star','doubleStar','openCluster','globularCluster','nebula','planetaryNebula','galaxy','constellation']}
steps=[obj({'type':{'const':'find'},'objectId':OID,'hint':TEXT}),obj({'type':{'const':'observe'},'objectId':OID,'minRating':{'type':'integer','minimum':1,'maximum':5}},['type','objectId']),obj({'type':{'const':'observeAny'},'category':CATEGORY,'count':NUM}),obj({'type':{'const':'read'},'contentId':OID}),obj({'type':{'const':'quiz'},'quizIds':arr(ID,1),'passRatio':{'type':'number','minimum':0,'maximum':1}}),obj({'type':{'const':'skill'},'skill':{'enum':['arMode','align1','align2','starhop','sketch','fovSetup','backup']}}),obj({'type':{'const':'checklist'},'items':arr(TEXT,1)})]
path=obj({'id':ID,'title':TEXT,'description':TEXT,'level':LEVEL,'season':SEASON,'missionIds':{**arr(ID,4,6),'uniqueItems':True}},['id','title','description','level','missionIds'])
mission=obj({'id':ID,'title':TEXT,'description':TEXT,'level':LEVEL,'season':SEASON,'estimatedMinutes':NUM,'requires':obj({'equipment':{**arr(LEVEL,1),'uniqueItems':True},'darkSky':{'type':'boolean'},'prerequisiteMissionIds':{**arr(ID),'uniqueItems':True}},[]),'steps':arr({'oneOf':steps},3,6),'rewardBadgeId':ID,'contentIds':{**arr(OID),'uniqueItems':True}},['id','title','description','level','estimatedMinutes','steps'])
# obj()의 optional required=[]는 명시적으로 덮어쓴다.
mission['properties']['requires']['required']=[]
rules=[obj({'key':{'enum':['firstObservation','firstSketch','firstStarHop','align2Success','planetsAll','moonPhasesAll']}}),obj({'key':{'enum':['messierCount','constellationCount','caldwellCount','streakNights','missionsCompleted','quizStreak']},'n':NUM}),obj({'key':{'const':'seasonSignature'},'id':{'enum':['summerTriangle','winterDiamond','springTriangle','autumnSquare']}})]
badge=obj({'id':ID,'title':TEXT,'description':TEXT,'icon':{'type':'string','minLength':1},'rule':{'oneOf':rules}})
common={'id':ID,'objectId':OID,'constellation':{'type':'string','pattern':'^[A-Z][A-Za-z]{2}$'},'question':TEXT,'explanation':TEXT,'difficulty':DIFF,'tags':{**arr({'type':'string','minLength':1},1),'uniqueItems':True}}
quizzes=[]
for typ,ans in [('mc',{'type':'integer','minimum':0,'maximum':3}),('trueFalse',{'type':'boolean'}),('skyPick',OID)]:
 props={**common,'type':{'const':typ},'answer':ans};req=['id','type','question','answer','explanation','difficulty','tags']
 if typ=='mc':props['choices']=arr(TEXT,3,4);req+=['choices']
 quizzes.append(obj(props,req))
for key,model in [('paths',path),('missions',mission),('badges',badge),('quiz',{'oneOf':quizzes})]:
 schema={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'G5 '+key+' — 첨부 Task7 규약',**arr(model)}
 (ROOT/f'{key}.schema.json').write_text(json.dumps(schema,ensure_ascii=False,indent=2)+'\n')
print('4 schemas written')
