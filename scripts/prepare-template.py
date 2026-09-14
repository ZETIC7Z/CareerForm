"""Preserve the source XLSX package; derive writable rectangles from a marked PDF export."""
from pathlib import Path
import zipfile, xml.etree.ElementTree as ET, json, subprocess, copy
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tmp'; OUT.mkdir(exist_ok=True)
fields=[]
def add(key,label,section,cell,page=0,group='Basics',kind='text',options=None):
    f=dict(key=key,label=label,section=section,cell=cell,page=page,group=group,type=kind)
    if options: f['options']=options.split('|')
    fields.append(f)

for key,label,cell in [('surname','Surname','D10'),('firstName','First name','D11'),('middleName','Middle name','D12'),('extension','Name extension','L11'),('birthDate','Date of birth','D13'),('birthPlace','Place of birth','D15'),('height','Height (m)','D22'),('weight','Weight (kg)','D24'),('bloodType','Blood type','D25'),('umid','UMID ID number','D27'),('pagibig','Pag-IBIG ID number','D29'),('philhealth','PhilHealth number','D31'),('psn','PhilSys number (PSN)','D32'),('tin','TIN number','D33'),('agencyId','Agency employee number','D34'),('telephone','Telephone number','I32'),('mobile','Mobile number','I33'),('email','Email address','I34')]:
    add(key,label,0,cell,group='Basics' if key in ['surname','firstName','middleName','extension','birthDate','birthPlace','height','weight','bloodType'] else 'Contact & identification',kind='date' if key=='birthDate' else 'email' if key=='email' else 'text')
for prefix,start in [('residential',17),('permanent',25)]:
    rows=[start,start+2,start+(5 if start==17 else 4)]
    for name,label,col,row in [('House','House / block / lot','I',rows[0]),('Street','Street','L',rows[0]),('Village','Subdivision / village','I',rows[1]),('Barangay','Barangay','L',rows[1]),('City','City / municipality','I',rows[2]),('Province','Province','L',rows[2]),('Zip','ZIP code','I',24 if start==17 else 31)]:
        add(prefix+name,label,0,f'{col}{row}',group=prefix.title()+' address')
for key,label,options in [('sex','Sex at birth','Male|Female'),('civilStatus','Civil status','Single|Married|Widowed|Separated|Other'),('citizenship','Citizenship','Filipino|Dual Citizenship'),('citizenshipBasis','Citizenship basis','By birth|By naturalization')]:
    add(key,label,0,None,options=options,kind='select')
add('civilOther','Other civil status details',0,None)
add('citizenshipCountry','Country of dual citizenship',0,'I16')
for prefix,label,start in [('spouse','Spouse',36),('father','Father',43),('mother','Mother (maiden name)',47)]:
    for suffix,part,cell in [('Surname','Surname',f'D{start}'),('First','First name',f'D{start+1}'),('Middle','Middle name',f'D{start+2}')]: add(prefix+suffix,part,1,cell,group=label)
    if prefix!='mother': add(prefix+'Extension','Name extension',1,f'G{start+1}',group=label)
for key,label,cell in [('spouseOccupation','Occupation','D39'),('spouseEmployer','Employer / business name','D40'),('spouseAddress','Business address','D41'),('spousePhone','Telephone number','D42')]: add(key,label,1,cell,group='Spouse')

tables={}
def table(key,label,section,page,rows,columns):
    tables[key]=dict(label=label,section=section,page=page,capacity=len(rows),columns=[dict(key=k,label=l,type=t) for k,l,c,t in columns])
    for i,row in enumerate(rows):
        for key2,label2,col,typ in columns: add(f'{key}.{i}.{key2}',label2,section,f'{col}{row}',page,group=key,kind=typ)
table('children','Children',1,0,list(range(37,49)),[('name','Full name','I','text'),('birthDate','Date of birth','M','date')])
table('education','Educational background',2,0,list(range(54,59)),[('school','School name (write in full)','D','text'),('degree','Degree / course','G','text'),('from','From (year)','J','text'),('to','To (year)','K','text'),('units','Highest level / units earned','L','text'),('graduated','Year graduated','M','text'),('honors','Scholarship / academic honors','N','text')])
tables['education']['columns'].insert(0,dict(key='level',label='Level',type='select',options=['Elementary','Secondary','Vocational / Trade Course','College','Graduate Studies']))
table('eligibility','Civil service eligibility',3,1,list(range(5,12)),[('name','Eligibility','A','text'),('rating','Rating','F','text'),('date','Examination / conferment date','G','date'),('place','Place of examination','I','text'),('license','License number','L','text'),('validUntil','Valid until','M','date')])
table('work','Work experience',4,1,list(range(18,46)),[('from','From','A','date'),('to','To (or Present)','C','text'),('position','Position title (write in full)','D','text'),('company','Department / agency / company','G','text'),('salary','Monthly salary','J','text'),('grade','Salary grade & step (00-0)','K','text'),('status','Appointment status','L','text'),('government','Government service (Y/N)','M','text')])
table('voluntary','Voluntary work',5,2,list(range(6,13)),[('organization','Organization name & address','A','text'),('from','From','E','date'),('to','To (or Present)','F','text'),('hours','Number of hours','G','text'),('position','Position / nature of work','H','text')])
table('training','Learning & development',6,2,list(range(18,39)),[('title','Training program title','A','text'),('from','From','E','date'),('to','To','F','date'),('hours','Number of hours','G','text'),('type','Type of L&D','H','text'),('sponsor','Conducted / sponsored by','I','text')])
for key,label,col in [('skills','Special skills & hobbies','A'),('distinctions','Non-academic distinctions','C'),('memberships','Memberships in organizations','I')]: table(key,label,7,2,list(range(42,49)),[('value',label,col,'text')])
table('references','Character references',8,3,list(range(52,55)),[('name','Full name','A','text'),('address','Office / residential address','F','text'),('contact','Contact number / email','G','text')])
questions=[('34a','Related within the third degree to the appointing / recommending authority or immediate supervisor?',6),('34b','Related within the fourth degree (LGU career employees)?',8),('35a','Ever found guilty of an administrative offense?',13),('35b','Ever criminally charged before any court?',18),('36','Ever convicted of a crime or violation by a court or tribunal?',23),('37','Ever separated from service, including resignation, retirement, termination or end of contract?',27),('38a','Candidate in a national or local election within the last year (except barangay election)?',31),('38b','Resigned from government service within three months before the last election to campaign?',34),('39','An immigrant or permanent resident of another country?',37),('40a','Member of an indigenous group?',43),('40b','Person with disability?',45),('40c','Solo parent?',47)]
for key,label,row in questions:
    add('q'+key,label,8,None,3,group='Declarations',kind='select',options='Yes|No')
    add('q'+key+'Details','Details / ID number (if Yes)',8,f'H{row+1}' if key in ['38a','38b'] else None,3,group='Declarations')
for key,label,cell in [('idType','Government-issued ID','D61'),('idNumber','ID / license / passport number','D62'),('idIssue','Date / place of issuance','D64'),('accomplished','Date accomplished','F64'),('caseDate','Date criminal case filed','I20'),('caseStatus','Status of case(s)','I21')]: add(key,label,8,cell,3,group='Identification & signing',kind='date' if key in ['accomplished','caseDate'] else 'text')
schema=dict(fields=fields,tables=tables,questions=[dict(key='q'+k,label=l,row=r) for k,l,r in questions])
(ROOT/'src/lib').mkdir(parents=True,exist_ok=True)
(ROOT/'src/lib/schema.json').write_text(json.dumps(schema,indent=2),encoding='utf8')

# Patch the XLSX XML directly so form-control drawings are not lost by openpyxl.
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
ET.register_namespace('',NS)
source=zipfile.ZipFile(ROOT/'assets/csc-2026.xlsx')
styles=ET.fromstring(source.read('xl/styles.xml'))
fonts=styles.find(f'{{{NS}}}fonts'); font=ET.SubElement(fonts,f'{{{NS}}}font'); ET.SubElement(font,f'{{{NS}}}sz',val='5'); ET.SubElement(font,f'{{{NS}}}name',val='Arial'); fi=len(fonts)-1;fonts.set('count',str(len(fonts)))
xfs=styles.find(f'{{{NS}}}cellXfs'); style_ids={}
wb=openpyxl.load_workbook(ROOT/'assets/csc-2026.xlsx')
for f in fields:
    if not f['cell']: continue
    s=wb.worksheets[f['page']];c=s[f['cell']]
    if isinstance(c,openpyxl.cell.cell.MergedCell):
        print('MERGED NON-ANCHOR',f['key'],f['cell']);f['cell']=None;continue
    if c.value and str(c.value).strip() and f['key'] not in ['extension','spouseExtension','fatherExtension']: print('LABEL OVERLAY',f['key'],f['cell'])
    old=c.style_id
    if old not in style_ids:
        xf=copy.deepcopy(xfs[old]);xf.set('fontId',str(fi));xf.set('applyFont','1');a=xf.find(f'{{{NS}}}alignment')
        if a is None:a=ET.SubElement(xf,f'{{{NS}}}alignment')
        a.attrib.clear();a.set('horizontal','left');a.set('vertical','center');xfs.append(xf);style_ids[old]=len(xfs)-1
xfs.set('count',str(len(xfs)))
for marked in [False,True]:
    dest=OUT/('marked.xlsx' if marked else 'print-template.xlsx')
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
        for item in source.infolist():
            data=source.read(item.filename)
            if item.filename=='xl/styles.xml' and marked:data=ET.tostring(styles,encoding='utf-8',xml_declaration=True)
            for pi in range(4):
                if item.filename!=f'xl/worksheets/sheet{pi+1}.xml':continue
                root=ET.fromstring(data);setup=root.find(f'{{{NS}}}pageSetup')
                setup.set('paperSize','256');setup.set('paperWidth','8in');setup.set('paperHeight','14in');setup.set('fitToWidth','1');setup.set('fitToHeight','1');setup.attrib.pop('scale',None)
                prop=root.find(f'{{{NS}}}sheetPr')
                if prop is None:prop=ET.Element(f'{{{NS}}}sheetPr');root.insert(0,prop)
                ps=prop.find(f'{{{NS}}}pageSetUpPr')
                if ps is None:ps=ET.SubElement(prop,f'{{{NS}}}pageSetUpPr')
                ps.set('fitToPage','1')
                if marked:
                    sd=root.find(f'{{{NS}}}sheetData')
                    for n,f in enumerate(fields):
                        if f['page']!=pi or not f['cell']:continue
                        rownum=''.join(filter(str.isdigit,f['cell']));row=sd.find(f'{{{NS}}}row[@r="{rownum}"]')
                        c=row.find(f'{{{NS}}}c[@r="{f["cell"]}"]')
                        if c is None:c=ET.SubElement(row,f'{{{NS}}}c',r=f['cell'])
                        c.clear();c.set('r',f['cell']);c.set('s',str(style_ids[wb.worksheets[pi][f['cell']].style_id]));c.set('t','inlineStr')
                        ET.SubElement(ET.SubElement(c,f'{{{NS}}}is'),f'{{{NS}}}t').text=f'Z{n:04}Z'
                data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
            z.writestr(item.filename,data)
    subprocess.run(['C:/Program Files/LibreOffice/program/soffice.exe','--headless','--convert-to','pdf','--outdir',str(OUT),str(dest)],check=True)
(ROOT/'src/lib/schema.json').write_text(json.dumps(schema,indent=2),encoding='utf8')
print('Schema fields',len(fields))

