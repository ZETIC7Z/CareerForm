import React from 'react';
import {renderToString} from 'react-dom/server';
import LetterDialog from '../src/components/letter-dialog';
import {emptyPDS} from '../src/lib/model';
import {letterFor,applyPlaceholders,letterPlainText} from '../src/lib/letter';
function main(){
 const html=renderToString(React.createElement(LetterDialog,{data:emptyPDS(),onClose:()=>{}}));
 const l=letterFor('application',emptyPDS());
 l.organization='DepEd';
 const text=applyPlaceholders(l.body,l,emptyPDS());
 const full=letterPlainText(l,emptyPDS());
 const checks={letterDialogRenders:html.includes('letter-paper')&&html.includes('Download letter PDF')&&html.includes('Application letter')&&html.includes('Transmittal letter'),placeholdersResolved:text.includes('DepEd'),salutation:full.includes('Dear Sir/Madam'),subjectLine:full.includes('Subject:')};
 console.log(JSON.stringify({...checks,dialogChars:html.length}));
 const failed=Object.entries(checks).filter(([,v])=>!v);
 if(failed.length)throw new Error('FAILED: '+failed.map(([k])=>k).join(', '));
}
main();
