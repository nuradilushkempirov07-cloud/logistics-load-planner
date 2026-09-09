import React from 'react';
import ReactDOM from 'react-dom/client';
import {ThemeProvider,createTheme,CssBaseline} from '@mui/material';
import App from './App';
import './styles.css';
import './detail.css';
const theme=createTheme({palette:{primary:{main:'#147d64'},background:{default:'#f4f6f8'}},typography:{fontFamily:'Inter, Segoe UI, Arial, sans-serif',fontSize:14},shape:{borderRadius:9},components:{MuiButton:{styleOverrides:{root:{textTransform:'none',fontWeight:600}}}}});
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider theme={theme}><CssBaseline/><App/></ThemeProvider></React.StrictMode>);
