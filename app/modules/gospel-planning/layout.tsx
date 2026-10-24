import type {ReactNode} from 'react';
import {moduleThemeBootstrap} from '../../../lib/gospel-planning/theme';

/** Applies the module's Atlas style before first paint unless the device has its own appearance. */
export default function GospelPlanningLayout({children}:{children:ReactNode}){
 return <><script dangerouslySetInnerHTML={{__html:moduleThemeBootstrap}}/>{children}</>;
}
