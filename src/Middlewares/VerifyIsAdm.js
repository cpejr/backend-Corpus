function verifyIsAdm(req, res, next){
    if(req?.userType === true){
        next();
    }

    return res.status(401).json({
        massage: "Operação não autorizada. Usuário não é administrador.",
    });
}

export default verifyIsAdm;