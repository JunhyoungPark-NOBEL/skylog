#!/usr/bin/env python3
"""Build and verify the integrated ZIP after draft validation.
Preserves source files, skips Python caches, and writes a SHA-256 member ledger.
"""
from __future__ import annotations
import argparse,hashlib,json,subprocess,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def sha(data):return hashlib.sha256(data).hexdigest()
def included(p):
    return p.is_file() and '__pycache__' not in p.parts and p.suffix not in {'.pyc','.pyo'} and p.name!='CHECKSUMS.sha256'
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT.parent/'G3-G5-integrated-package.zip')
    args=parser.parse_args();output=args.output.resolve()
    if ROOT==output or ROOT in output.parents:
        parser.error('Output ZIP must be outside the input folder.')
    subprocess.run([sys.executable,str(ROOT/'scripts/validate_all.py')],check=True,cwd=ROOT)
    files=sorted((p for p in ROOT.rglob('*') if included(p)),key=lambda p:p.relative_to(ROOT).as_posix())
    hashes={p.relative_to(ROOT).as_posix():sha(p.read_bytes()) for p in files}
    (ROOT/'CHECKSUMS.sha256').write_text(''.join(f'{value}  {name}\n' for name,value in hashes.items()),encoding='utf-8')
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in files+[ROOT/'CHECKSUMS.sha256']:
            z.write(p,arcname=ROOT.name+'/'+p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(output) as z:
        error=z.testzip()
        if error:raise ValueError('CRC failure: '+error)
        names=z.namelist()
        if len(names)!=len(set(names)):raise ValueError('Duplicate member names')
        for name in names:
            if name.startswith('/') or '..' in Path(name).parts:raise ValueError('Unsafe member path')
        for name,expected in hashes.items():
            if sha(z.read(ROOT.name+'/'+name))!=expected:raise ValueError('SHA-256 mismatch: '+name)
        manifest=json.loads(z.read(ROOT.name+'/manifest.json'))
        actual={}
        for label,name in manifest['canonicalImportFiles'].items():
            value=json.loads(z.read(ROOT.name+'/'+name))
            if not isinstance(value,list):raise ValueError('Canonical array expected: '+name)
            actual[label]=len(value)
        expected={'G3':121,'G5-paths':6,'G5-missions':30,'G5-badges':18,'G5-quiz':180}
        if actual!=expected:raise ValueError(f'Canonical counts mismatch: {actual}')
        g3hash=sha(z.read(ROOT.name+'/'+manifest['canonicalImportFiles']['G3']))
        if g3hash!=manifest['g3ContentSha256']:raise ValueError('G3 source content changed')
        validation=json.loads(z.read(ROOT.name+'/integration/validation.json'))
        if not validation['draftValidationPassed']:raise ValueError('Draft validation did not pass')
    result={'file':output.name,'archiveBytes':output.stat().st_size,'archiveSha256':sha(output.read_bytes()),
      'members':len(names),'hashedMembers':len(hashes),'crcTest':'passed','sha256Readback':'passed',
      'canonicalArrayCounts':actual,'g3SourceSha256':g3hash,'draftValidationPassed':True,'appReleaseReady':False,
      'note':'압축·파일 무결성 검증. 천문학적 주장이나 실제 앱 게시 승인을 의미하지 않음.'}
    verification=output.with_name(output.stem+'-verification.json')
    verification.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0
if __name__=='__main__':sys.exit(main())
